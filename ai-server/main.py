from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import json
from typing import Optional
from datetime import datetime
import os
import groq
from dotenv import load_dotenv
from python_types.types import SearchQuery, ChatMessage, Neo4jConnection
from services.chatbot_service import extract_query_terms, generate_groq_response_with_model, detect_response_length
from services.neo4j_service import query_neo4j_for_general_stats
from services.misc_service import process_reddit_data, detect_communities
from services.init_neo4j import create_graph_database

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

neo4j_connection = Neo4jConnection(
    uri=os.getenv("NEO4J_URI", "bolt://localhost:7687"),
    user=os.getenv("NEO4J_USER", "neo4j"),
    password=os.getenv("NEO4J_PASSWORD", "Sameer4224")
)   


@app.post("/api/init-database")
async def init_database():
    """Initialize the Neo4j graph database with data from the JSONL file."""
    try:
        data = process_reddit_data()
        create_graph_database(data)
        return {"status": "success", "message": "Database initialized successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/time-series")
async def get_time_series(
    query: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    subreddits: Optional[str] = Query(None)
):
    """Get time series data for posts matching the query."""
    try:
        cypher_query = """
        MATCH (p:Post)-[:POSTED_IN]->(s:Subreddit)
        """
        
        where_clauses = []
        params = {}
        
        if query:
            where_clauses.append("(toLower(p.title) CONTAINS toLower($query) OR toLower(p.selftext) CONTAINS toLower($query))")
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
        RETURN date(datetime({epochSeconds: toInteger(p.created_utc)})) as date, count(p) as count
        ORDER BY date
        """
        
        result = neo4j_connection.query(cypher_query, params)
        
        time_series_data = [{"date": record["date"].isoformat(), "count": record["count"]} for record in result]
        
        if not time_series_data:
            print("Query returned no data")
            return {"data": [], "message": "No matching posts found for the given criteria"}
            
        return {"data": time_series_data}
        
    except Exception as e:
        print(f"Error in time_series endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
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
        
        distribution_data = [{"name": record["subreddit"], "value": record["count"]} for record in result]
        
        return distribution_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
        
        for author in author_nodes:
            nodes.append({"id": author, "group": 1, "type": "author"})
            
        for subreddit in subreddit_nodes:
            nodes.append({"id": subreddit, "group": 2, "type": "subreddit"})
        
        nodes = detect_communities(nodes, links)
        
        return {"nodes": nodes, "links": links}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai-analysis")
async def get_ai_analysis(search_query: SearchQuery):
    """Get AI-powered analysis of the search results."""
    try:
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
        
        posts = [{"title": record["title"], "content": record["selftext"], "score": record["score"]} for record in result]
        
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
        
        analysis = generate_groq_response_with_model(prompt, model_name="llama3-8b-8192")
        
        return {"analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/chatbot")
async def chatbot(message: ChatMessage):
    """
    Interact with a chatbot that uses two models in sequence:
    1. gemma2-9b-it to refine the user's prompt
    2. llama3-8b-8192 to generate the final response based on Neo4j data and JSON file data
    """
    try:
        user_message = message.message

        response_length = detect_response_length(user_message)
        
        query_terms = extract_query_terms(user_message)
        
        neo4j_data = query_neo4j_for_general_stats(query_terms)
        
        json_file_path = os.path.join("data", "data.json")
        try:
            with open(json_file_path, 'r') as file:
                json_data = json.load(file)
        except Exception as e:
            print(f"Error loading JSON file: {str(e)}")
            json_data = {"error": "Could not load JSON data file"}
        
        refiner_prompt = f"""
        You are an expert prompt engineer. Your job is to refine the following user question 
        to help extract the most relevant information from a Neo4j graph database containing Reddit posts.

        User question: {user_message}

        Available data context: 
        {json.dumps(neo4j_data, indent=2)}

        Additional JSON data:
        {json.dumps(json_data, indent=2)}

        Please refine this query to:
        1. Be specific about what data to retrieve from the database
        2. Clarify ambiguous terms
        3. Focus on extracting factual information present in the database
        4. Include specific filtering criteria if implied in the original question
        5. Ensure the refined query can be answered in ONE SENTENCE if the user requested a concise response

        Return ONLY the refined prompt without explanation or additional text.
        """
        
        refined_prompt = generate_groq_response_with_model(refiner_prompt, "gemma2-9b-it", 500)
        
        final_prompt = f"""
        You are a data analyst assistant specialized in answering questions about Reddit posts data.
        
        Answer the following question using ONLY the Neo4j data and JSON file data provided below:
        
        Refined question: {refined_prompt}
        
        Database context (Reddit posts data):
        {json.dumps(neo4j_data, indent=2)}
        
        Additional JSON data:
        {json.dumps(json_data, indent=2)}
        
        Guidelines:
        - ONLY use information from the provided data contexts
        - If the data doesn't contain information to answer the question, clearly state that
        - Format your response in a clear, concise way if the user requested a short answer
        - Provide detailed analysis if the user requested a detailed answer
        - Include specific data points from the contexts when possible
        - If you see patterns or trends in the data, highlight them
        - DO NOT make up information not present in the data
        """
        
        final_response = generate_groq_response_with_model(final_prompt, "llama3-8b-8192", 1000)

        if response_length == "concise":
            final_response = generate_groq_response_with_model(
                f"Summarize this in one sentence: {final_response}", 
                "llama3-8b-8192", 
                100
            )
        
        return {"response": final_response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Social Media Analysis API is running. Access the dashboard at /docs for API documentation."}