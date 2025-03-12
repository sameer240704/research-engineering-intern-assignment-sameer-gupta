from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from neo4j import GraphDatabase

class Neo4jConnection:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        
    def close(self):
        self.driver.close()
        
    def query(self, query, parameters=None):
        with self.driver.session() as session:
            result = session.run(query, parameters)
            return [record for record in result]

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