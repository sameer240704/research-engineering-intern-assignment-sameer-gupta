from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import json
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
import os
import groq
from dotenv import load_dotenv
from python_types.types import SearchQuery, ChatMessage, Neo4jConnection
from services.chatbot_service import extract_query_terms, detect_response_length
from services.neo4j_service import query_neo4j_for_general_stats
from services.misc_service import process_reddit_data, detect_communities, filter_json_data
from services.init_neo4j import create_graph_database
import nltk

nltk.download("punkt")
nltk.download("punkt_tab")
nltk.download("stopwords")

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

def generate_groq_response(prompt: str, model_name: str, max_tokens: int = 1000, max_input_tokens: int = 4000):
    """Generate response from Groq LLM with token management"""

    def estimate_tokens(text: str) -> int:
        return len(text) // 4
    
    if estimate_tokens(prompt) > max_input_tokens:
        chars_to_keep = max_input_tokens * 4
        half_length = chars_to_keep // 2
        prompt = prompt[:half_length] + "\n...[content truncated for brevity]...\n" + prompt[-half_length:]
    
    try:
        response = groq_client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error calling Groq API: {str(e)}")
        raise e

def rephrase_query(user_query: str, model_name: str = "llama3-8b-8192") -> Tuple[str, List[str]]:
    """
    Rephrase user query to be more specific and extract key search terms.
    
    Returns:
        Tuple[str, List[str]]: (rephrased_query, extracted_keywords)
    """
    prompt = f"""
    You are an expert at improving search queries about Reddit data. Rephrase this query to be more precise:
    
    Original query: "{user_query}"
    
    Your task:
    1. Reformulate the query to be more specific and structured
    2. Extract 3-5 key search terms/keywords from the query

    Format your response exactly like this example:
    
    Rephrased query: What is the weekly trend of posts about cryptocurrency in the r/Finance subreddit?
    Keywords: cryptocurrency, Finance, weekly trend, posts
    """
    
    try:
        response = generate_groq_response(prompt, model_name, max_tokens=200, max_input_tokens=1000)
        
        rephrased_query = ""
        keywords = []
        
        for line in response.split('\n'):
            if line.startswith("Rephrased query:"):
                rephrased_query = line.replace("Rephrased query:", "").strip()
            elif line.startswith("Keywords:"):
                keywords_text = line.replace("Keywords:", "").strip()
                keywords = [k.strip() for k in keywords_text.split(',')]
        
        if not rephrased_query:
            rephrased_query = user_query
            
        if not keywords:
            keywords = extract_query_terms(user_query)
            
        return rephrased_query, keywords
    except Exception as e:
        print(f"Error rephrasing query: {str(e)}")
        return user_query, extract_query_terms(user_query)

def reduce_data_context(data: Dict[str, Any], max_items: int = 5) -> Dict[str, Any]:
    """Reduce data context size by limiting number of items"""
    
    if not data:
        return {}
    
    reduced_data = {}
    
    for key, value in data.items():
        if isinstance(value, list):
            reduced_data[key] = value[:max_items]
            if len(value) > max_items:
                reduced_data[f"{key}_count"] = len(value)
        elif isinstance(value, dict):
            reduced_data[key] = reduce_data_context(value, max_items//2)
        else:
            reduced_data[key] = value
    
    return reduced_data

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
            try:
                start_timestamp = datetime.fromisoformat(start_date).timestamp()
                where_clauses.append("p.created_utc >= $start_timestamp")
                params["start_timestamp"] = start_timestamp
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format. Use ISO format (e.g., 2023-01-01).")
            
        if end_date:
            try:
                end_timestamp = datetime.fromisoformat(end_date).timestamp()
                where_clauses.append("p.created_utc <= $end_timestamp")
                params["end_timestamp"] = end_timestamp
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format. Use ISO format (e.g., 2023-01-31).")
            
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
        
        if not topic_data:
            return {"message": "No trending topics found for the given criteria."}
        
        return topic_data
    except Exception as e:
        print(f"Error fetching topic trends: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while fetching topic trends.")

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
        rephrased_query, keywords = rephrase_query(search_query.query) if search_query.query else ("", [])
        
        search_term = rephrased_query if rephrased_query else search_query.query
        
        cypher_query = """
        MATCH (p:Post)
        """
        
        where_clauses = []
        params = {}
        
        if search_term:
            where_clauses.append("(p.title CONTAINS $query OR p.selftext CONTAINS $query)")
            params["query"] = search_term
            
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
        ORDER BY p.score DESC
        LIMIT 10
        """
        
        result = neo4j_connection.query(cypher_query, params)
        
        posts = [{"title": record["title"], "content": record["selftext"][:300], "score": record["score"]} for record in result]
        
        post_texts = "\n\n".join([f"Title: {post['title']}\nScore: {post['score']}\nContent: {post['content']}..." for post in posts])
        
        prompt = f"""
        Analyze these Reddit posts related to:
        Original query: "{search_query.query}"
        Rephrased query: "{rephrased_query}"
        Key themes to focus on: {', '.join(keywords) if keywords else 'any relevant themes'}
        
        Posts:
        {post_texts}
        
        Provide a concise analysis covering:
        1. Main themes
        2. Key points
        3. Overall sentiment
        4. Notable patterns
        """
        
        analysis = generate_groq_response(prompt, model_name="llama3-8b-8192", max_tokens=1000, max_input_tokens=4000)
        
        return {"analysis": analysis, "rephrased_query": rephrased_query, "keywords": keywords}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/chatbot")
async def chatbot(message: ChatMessage):
    """
    Interact with a chatbot that first rephrases user queries for better understanding.
    """
    try:
        user_message = message.message
        response_length = detect_response_length(user_message)
        
        rephrased_query, keywords = rephrase_query(user_message)
        
        neo4j_data = {}
        try:
            if keywords:
                neo4j_data = query_neo4j_for_general_stats(keywords[:3])  
        except Exception as e:
            print(f"Neo4j query error: {str(e)}")
        
        filtered_json_data = {}
        try:
            json_file_path = os.path.join("data", "processed_data.json")
            with open(json_file_path, 'r') as file:
                json_data = json.load(file)
                
            if keywords:
                filtered_json_data = filter_json_data(json_data, keywords)
                filtered_json_data = reduce_data_context(filtered_json_data, max_items=3)  # Limit items
        except Exception as e:
            print(f"JSON processing error: {str(e)}")
        
        combined_data = {
            "original_query": user_message,
            "rephrased_query": rephrased_query,
            "keywords": keywords,
            "data_summary": {
                "neo4j_data_available": bool(neo4j_data),
                "json_data_available": bool(filtered_json_data)
            }
        }
        
        if neo4j_data:
            combined_data["neo4j_highlights"] = neo4j_data
        
        if filtered_json_data:
            combined_data["json_highlights"] = filtered_json_data
            
        prompt = f"""
        You are a data analyst assistant for Reddit data. Generate a response to this user query:
        
        Original query: "{user_message}"
        Rephrased for clarity: "{rephrased_query}"
        Keywords identified: {', '.join(keywords) if keywords else 'None identified'}
        
        Available Data:
        {json.dumps(combined_data, indent=2, default=str)}
        
        Guidelines:
        - Only use information present in the provided data
        - If data is insufficient, acknowledge limitations clearly
        - {'Keep your answer concise (1-2 short paragraphs max)' if response_length == 'concise' else 'Provide thorough analysis'}
        - Include specific numbers/stats when available
        - Do not make up information
        - Structure your response in a natural, conversational way
        - If appropriate, suggest follow-up questions the user might want to ask
        """
        
        try:
            final_response = generate_groq_response(
                prompt, 
                "llama3-8b-8192", 
                max_tokens=800 if response_length == 'concise' else 1500,
                max_input_tokens=4000
            )
        except Exception as e:
            print(f"LLM API error: {str(e)}")
            final_response = "I'm having trouble processing your request due to data size limitations. Could you ask a more specific question about a particular aspect of the Reddit data?"
        
        return {
            "response": final_response,
            "rephrased_query": rephrased_query,
            "keywords": keywords
        }
    except Exception as e:
        print(f"Error in chatbot endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Social Media Analysis API is running. Access the dashboard at /docs for API documentation."}