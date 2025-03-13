import os
from python_types.types import Neo4jConnection
from services.misc_service import extract_topics_from_text
from dotenv import load_dotenv

load_dotenv()

neo4j_connection = Neo4jConnection(
    uri=os.getenv("NEO4J_URI"),
    user=os.getenv("NEO4J_USER"),
    password=os.getenv("NEO4J_PASSWORD")
)

def create_graph_database(data):
    """Create a graph database from the Reddit data."""
    neo4j_connection.query("MATCH (n) DETACH DELETE n")
    
    neo4j_connection.query("CREATE CONSTRAINT IF NOT EXISTS FOR (s:Subreddit) REQUIRE s.name IS UNIQUE")
    neo4j_connection.query("CREATE CONSTRAINT IF NOT EXISTS FOR (a:Author) REQUIRE a.name IS UNIQUE")
    neo4j_connection.query("CREATE CONSTRAINT IF NOT EXISTS FOR (p:Post) REQUIRE p.id IS UNIQUE")
    
    for post in data:
        if "data" not in post:
            continue
            
        post_data = post["data"]
        
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