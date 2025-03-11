# app/main.py
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import os
from neo4j import GraphDatabase
import re
from collections import Counter
import networkx as nx
import community
import groq
from dotenv import load_dotenv

load_dotenv()

groq_client = groq.Client(api_key=os.getenv("GROQ_API_KEY"))

app = FastAPI(title="Social Media Analysis Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Neo4jConnection:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        
    def close(self):
        self.driver.close()
        
    def query(self, query, parameters=None):
        with self.driver.session() as session:
            result = session.run(query, parameters)
            return [record for record in result]

neo4j_connection = Neo4jConnection(
    uri=os.getenv("NEO4J_URI", "bolt://localhost:7687"),
    user=os.getenv("NEO4J_USER", "neo4j"),
    password=os.getenv("NEO4J_PASSWORD", "Sameer4224")
)

# Data classes
class RedditPost(BaseModel):
    kind: str
    data: Dict[str, Any]

class SearchQuery(BaseModel):
    query: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    subreddits: Optional[List[str]] = None
    
class ChatMessage(BaseModel):
    message: str

# Helper functions
def process_reddit_data(jsonl_file="data/data.jsonl"):
    """Process the Reddit data from a JSONL file."""
    data = []
    with open(jsonl_file, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                post = json.loads(line)
                data.append(post)
            except json.JSONDecodeError:
                continue
    return data

def generate_groq_response(prompt, max_tokens=1000):
    """Generate a response using the Groq API."""
    try:
        response = groq_client.chat.completions.create(
            model="llama3-8b-8192", 
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=0.7,
            top_p=0.9
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error generating response: {str(e)}"
    
def detect_communities(nodes, links):
    """Detect communities in the network graph."""
    graph = nx.Graph()
    
    # Add nodes
    for node in nodes:
        graph.add_node(node["id"], group=node["group"])
    
    # Add edges
    for link in links:
        graph.add_edge(link["source"], link["target"], weight=link["value"])
    
    # Detect communities
    partition = community.best_partition(graph)
    
    # Add community information to nodes
    for node in nodes:
        node["community"] = partition[node["id"]]
    
    return nodes

def create_graph_database(data):
    """Create a graph database from the Reddit data."""
    # Clear existing data
    neo4j_connection.query("MATCH (n) DETACH DELETE n")
    
    # Create constraints and indexes
    neo4j_connection.query("CREATE CONSTRAINT IF NOT EXISTS FOR (s:Subreddit) REQUIRE s.name IS UNIQUE")
    neo4j_connection.query("CREATE CONSTRAINT IF NOT EXISTS FOR (a:Author) REQUIRE a.name IS UNIQUE")
    neo4j_connection.query("CREATE CONSTRAINT IF NOT EXISTS FOR (p:Post) REQUIRE p.id IS UNIQUE")
    
    # Create nodes and relationships
    for post in data:
        if "data" not in post:
            continue
            
        post_data = post["data"]
        
        # Create Post node
        neo4j_connection.query(
            """
            MERGE (p:Post {id: $id})
            SET p.title = $title, 
                p.selftext = $selftext, 
                p.created_utc = $created_utc,
                p.score = $score,
                p.num_comments = $num_comments,
                p.upvote_ratio = $upvote_ratio
            """,
            {
                "id": post_data.get("name", ""),
                "title": post_data.get("title", ""),
                "selftext": post_data.get("selftext", ""),
                "created_utc": post_data.get("created_utc", 0),
                "score": post_data.get("score", 0),
                "num_comments": post_data.get("num_comments", 0),
                "upvote_ratio": post_data.get("upvote_ratio", 0)
            }
        )
        
        # Create Subreddit node and relationship
        if "subreddit" in post_data:
            neo4j_connection.query(
                """
                MERGE (s:Subreddit {name: $name})
                WITH s
                MATCH (p:Post {id: $post_id})
                MERGE (p)-[:POSTED_IN]->(s)
                """,
                {
                    "name": post_data["subreddit"],
                    "post_id": post_data.get("name", "")
                }
            )
        
        # Create Author node and relationship
        if "author" in post_data and post_data["author"] != "[deleted]":
            neo4j_connection.query(
                """
                MERGE (a:Author {name: $name})
                WITH a
                MATCH (p:Post {id: $post_id})
                MERGE (p)-[:AUTHORED_BY]->(a)
                """,
                {
                    "name": post_data["author"],
                    "post_id": post_data.get("name", "")
                }
            )
            
        # Extract and create Topic nodes
        if "selftext" in post_data and post_data["selftext"]:
            topics = extract_topics_from_text(post_data["selftext"])
            for topic in topics:
                neo4j_connection.query(
                    """
                    MERGE (t:Topic {name: $name})
                    WITH t
                    MATCH (p:Post {id: $post_id})
                    MERGE (p)-[:DISCUSSES]->(t)
                    """,
                    {
                        "name": topic,
                        "post_id": post_data.get("name", "")
                    }
                )

def extract_topics_from_text(text, num_topics=5):
    """Extract topics from text using LDA."""
    if not text or len(text) < 50:
        return []
        
    # Basic preprocessing
    cleaned_text = re.sub(r'[^\\w\\s]', '', text.lower())
    
    # Simple keyword extraction based on frequency
    words = cleaned_text.split()
    word_freq = Counter(words)
    
    # Remove common stopwords
    stopwords = {'the', 'and', 'is', 'of', 'to', 'a', 'in', 'that', 'this', 'it', 'for', 'on', 'with', 'as', 'by'}
    for word in stopwords:
        if word in word_freq:
            del word_freq[word]
    
    # Return top words as topics
    return [word for word, _ in word_freq.most_common(num_topics)]

# Endpoint to initialize the database
@app.post("/api/init-database")
async def init_database():
    """Initialize the Neo4j graph database with data from the JSONL file."""
    try:
        data = process_reddit_data()
        create_graph_database(data)
        return {"status": "success", "message": "Database initialized successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint to get time series data
@app.get("/api/time-series")
async def get_time_series(
    query: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    subreddits: Optional[str] = Query(None)
):
    """Get time series data for posts matching the query."""
    try:
        # Build Neo4j query based on parameters
        cypher_query = """
        MATCH (p:Post)
        """
        
        where_clauses = []
        params = {}
        
        if query:
            where_clauses.append("(p.title CONTAINS $query OR p.selftext CONTAINS $query)")
            params["query"] = query
            
        if start_date:
            start_timestamp = datetime.fromisoformat(start_date).timestamp()
            where_clauses.append("p.created_utc >= $start_timestamp")
            params["start_timestamp"] = start_timestamp
            
        if end_date:
            end_timestamp = datetime.fromisoformat(end_date).timestamp()
            where_clauses.append("p.created_utc <= $end_timestamp")
            params["end_timestamp"] = end_timestamp
            
        if subreddits:
            subreddit_list = [s.strip() for s in subreddits.split(",")]
            where_clauses.append("EXISTS { MATCH (p)-[:POSTED_IN]->(s:Subreddit) WHERE s.name IN $subreddit_list }")
            params["subreddit_list"] = subreddit_list
            
        if where_clauses:
            cypher_query += "WHERE " + " AND ".join(where_clauses)
            
        cypher_query += """
        RETURN date(datetime({epochSeconds: toInteger(p.created_utc)})) as date, count(*) as count
        ORDER BY date
        """
        
        result = neo4j_connection.query(cypher_query, params)
        
        # Format the result
        time_series_data = [{"date": record["date"].isoformat(), "count": record["count"]} for record in result]
        
        return time_series_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# Endpoint to get community distribution
@app.get("/api/community-distribution")
async def get_community_distribution(
    query: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Get distribution of posts across different subreddits."""
    try:
        cypher_query = """
        MATCH (p:Post)-[:POSTED_IN]->(s:Subreddit)
        """
        
        where_clauses = []
        params = {}
        
        if query:
            where_clauses.append("(p.title CONTAINS $query OR p.selftext CONTAINS $query)")
            params["query"] = query
            
        if start_date:
            start_timestamp = datetime.fromisoformat(start_date).timestamp()
            where_clauses.append("p.created_utc >= $start_timestamp")
            params["start_timestamp"] = start_timestamp
            
        if end_date:
            end_timestamp = datetime.fromisoformat(end_date).timestamp()
            where_clauses.append("p.created_utc <= $end_timestamp")
            params["end_timestamp"] = end_timestamp
            
        if where_clauses:
            cypher_query += "WHERE " + " AND ".join(where_clauses)
            
        cypher_query += """
        RETURN s.name as subreddit, count(*) as count
        ORDER BY count DESC
        LIMIT 10
        """
        
        result = neo4j_connection.query(cypher_query, params)
        
        # Format the result
        distribution_data = [{"name": record["subreddit"], "value": record["count"]} for record in result]
        
        return distribution_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint to get topic trends
@app.get("/api/topic-trends")
async def get_topic_trends(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    subreddits: Optional[str] = Query(None)
):
    """Get trending topics over time."""
    try:
        cypher_query = """
        MATCH (p:Post)-[:DISCUSSES]->(t:Topic)
        """
        
        where_clauses = []
        params = {}
            
        if start_date:
            start_timestamp = datetime.fromisoformat(start_date).timestamp()
            where_clauses.append("p.created_utc >= $start_timestamp")
            params["start_timestamp"] = start_timestamp
            
        if end_date:
            end_timestamp = datetime.fromisoformat(end_date).timestamp()
            where_clauses.append("p.created_utc <= $end_timestamp")
            params["end_timestamp"] = end_timestamp
            
        if subreddits:
            subreddit_list = [s.strip() for s in subreddits.split(",")]
            where_clauses.append("EXISTS { MATCH (p)-[:POSTED_IN]->(s:Subreddit) WHERE s.name IN $subreddit_list }")
            params["subreddit_list"] = subreddit_list
            
        if where_clauses:
            cypher_query += "WHERE " + " AND ".join(where_clauses)
            
        cypher_query += """
        RETURN t.name as topic, count(*) as count
        ORDER BY count DESC
        LIMIT 15
        """
        
        result = neo4j_connection.query(cypher_query, params)
        
        # Format the result
        topic_data = [{"topic": record["topic"], "count": record["count"]} for record in result]
        
        return topic_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/network-graph")
async def get_network_graph(
    query: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    subreddits: Optional[str] = Query(None),
    limit: int = Query(100)
):
    """Get a network graph of authors and subreddits with filters."""
    try:
        # Build Neo4j query based on parameters
        cypher_query = """
        MATCH (a:Author)-[:AUTHORED_BY]-(p:Post)-[:POSTED_IN]->(s:Subreddit)
        """
        
        where_clauses = []
        params = {"limit": limit}
        
        if query:
            where_clauses.append("(p.title CONTAINS $query OR p.selftext CONTAINS $query)")
            params["query"] = query
            
        if start_date:
            start_timestamp = datetime.fromisoformat(start_date).timestamp()
            where_clauses.append("p.created_utc >= $start_timestamp")
            params["start_timestamp"] = start_timestamp
            
        if end_date:
            end_timestamp = datetime.fromisoformat(end_date).timestamp()
            where_clauses.append("p.created_utc <= $end_timestamp")
            params["end_timestamp"] = end_timestamp
            
        if subreddits:
            subreddit_list = [s.strip() for s in subreddits.split(",")]
            where_clauses.append("s.name IN $subreddit_list")
            params["subreddit_list"] = subreddit_list
            
        if where_clauses:
            cypher_query += "WHERE " + " AND ".join(where_clauses)
            
        cypher_query += """
        RETURN a.name as author, collect(distinct s.name) as subreddits
        LIMIT $limit
        """
        
        result = neo4j_connection.query(cypher_query, params)
        
        # Process and organize the data
        nodes = []
        links = []
        subreddit_nodes = set()
        author_nodes = set()
        
        for record in result:
            author = record["author"]
            author_nodes.add(author)
            
            for subreddit in record["subreddits"]:
                subreddit_nodes.add(subreddit)
                links.append({"source": author, "target": subreddit, "value": 1})
        
        # Add nodes
        for author in author_nodes:
            nodes.append({"id": author, "group": 1, "type": "author"})
            
        for subreddit in subreddit_nodes:
            nodes.append({"id": subreddit, "group": 2, "type": "subreddit"})
        
        # Detect communities
        nodes = detect_communities(nodes, links)
        
        return {"nodes": nodes, "links": links}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# Endpoint for AI analysis
@app.post("/api/ai-analysis")
async def get_ai_analysis(search_query: SearchQuery):
    """Get AI-powered analysis of the search results."""
    try:
        # Build Neo4j query based on parameters
        cypher_query = """
        MATCH (p:Post)
        """
        
        where_clauses = []
        params = {}
        
        if search_query.query:
            where_clauses.append("(p.title CONTAINS $query OR p.selftext CONTAINS $query)")
            params["query"] = search_query.query
            
        if search_query.start_date:
            start_timestamp = datetime.fromisoformat(search_query.start_date).timestamp()
            where_clauses.append("p.created_utc >= $start_timestamp")
            params["start_timestamp"] = start_timestamp
            
        if search_query.end_date:
            end_timestamp = datetime.fromisoformat(search_query.end_date).timestamp()
            where_clauses.append("p.created_utc <= $end_timestamp")
            params["end_timestamp"] = end_timestamp
            
        if search_query.subreddits:
            where_clauses.append("EXISTS { MATCH (p)-[:POSTED_IN]->(s:Subreddit) WHERE s.name IN $subreddit_list }")
            params["subreddit_list"] = search_query.subreddits
            
        if where_clauses:
            cypher_query += "WHERE " + " AND ".join(where_clauses)
            
        cypher_query += """
        RETURN p.title as title, p.selftext as selftext, p.score as score
        LIMIT 20
        """
        
        result = neo4j_connection.query(cypher_query, params)
        
        # Extract post data for analysis
        posts = [{"title": record["title"], "content": record["selftext"], "score": record["score"]} for record in result]
        
        # Prepare data for Groq API analysis
        post_texts = "\n\n".join([f"Title: {post['title']}\nContent: {post['content'][:500]}..." for post in posts])
        
        prompt = f"""
        Analyze the following Reddit posts related to the query "{search_query.query}":
        
        {post_texts}
        
        Please provide:
        1. A summary of the main themes and narratives
        2. Key talking points that appear frequently
        3. The overall sentiment and emotional tone
        4. Any notable patterns or outliers
        5. Recommendations for further analysis
        
        Be concise and insightful.
        """
        
        # Generate analysis using Groq API
        analysis = generate_groq_response(prompt)
        
        return {"analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# Endpoint for chatbot
@app.post("/api/chatbot")
async def chatbot(message: ChatMessage):
    """Interact with a chatbot to query the social media data."""
    try:
        user_message = message.message
        
        # Generate a prompt for the Groq API
        prompt = f"""
        You are an assistant helping with social media data analysis. Answer the following question using the available data:
        
        User question: {user_message}
        
        When answering:
        - Focus on providing data-driven insights
        - Be concise but informative
        - If you need specific data that isn't available, explain why and suggest alternatives
        - Connect trends to broader social context when relevant
        
        Your answer:
        """
        
        # Use Groq API to generate a response
        response = generate_groq_response(prompt)
        
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Social Media Analysis API is running. Access the dashboard at /docs for API documentation."}