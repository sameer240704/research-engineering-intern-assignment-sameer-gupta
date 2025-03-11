from neo4j import GraphDatabase
import json
import os
import re
from collections import Counter

class Neo4jInitializer:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        
    def close(self):
        self.driver.close()
        
    def query(self, query, parameters=None):
        with self.driver.session() as session:
            result = session.run(query, parameters)
            return [record for record in result]
    
    def create_constraints_and_indexes(self):
        """Create necessary constraints and indexes for better performance."""
        print("Creating constraints and indexes...")
        
        constraints = [
            "CREATE CONSTRAINT IF NOT EXISTS FOR (s:Subreddit) REQUIRE s.name IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (a:Author) REQUIRE a.name IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (p:Post) REQUIRE p.id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (t:Topic) REQUIRE t.name IS UNIQUE"
        ]
        
        indexes = [
            "CREATE INDEX IF NOT EXISTS FOR (p:Post) ON (p.created_utc)",
            "CREATE INDEX IF NOT EXISTS FOR (p:Post) ON (p.title)",
            "CREATE INDEX IF NOT EXISTS FOR (p:Post) ON (p.score)"
        ]
        
        for constraint in constraints:
            self.query(constraint)
            
        for index in indexes:
            self.query(index)
            
        print("Constraints and indexes created successfully.")
    
    def extract_topics_from_text(self, text, num_topics=5):
        """Extract topics from text using simple frequency analysis."""
        if not text or len(text) < 50:
            return []
            
        # Basic preprocessing
        cleaned_text = re.sub(r'[^\w\s]', '', text.lower())
        
        # Simple keyword extraction based on frequency
        words = cleaned_text.split()
        word_freq = Counter(words)
        
        # Remove common stopwords
        stopwords = {'the', 'and', 'is', 'of', 'to', 'a', 'in', 'that', 'this', 'it', 'for', 'on', 'with', 'as', 'by',
                    'i', 'you', 'we', 'they', 'he', 'she', 'my', 'your', 'their', 'his', 'her', 'its', 'our', 'am', 
                    'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'but', 
                    'or', 'if', 'because', 'as', 'until', 'while', 'at', 'from', 'after', 'over', 'under', 'again', 
                    'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 
                    'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 
                    'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now'}
        
        for word in list(word_freq.keys()):
            if word in stopwords or len(word) < 3:
                del word_freq[word]
        
        # Return top words as topics
        return [word for word, _ in word_freq.most_common(num_topics)]
    
    def extract_entities(self, text):
        """Extract entities from text using simple pattern matching."""
        entities = []
        
        # Extract URLs
        url_pattern = r'https?://\S+'
        urls = re.findall(url_pattern, text)
        for url in urls:
            entities.append(("URL", url))
        
        # Extract hashtags
        hashtag_pattern = r'#\w+'
        hashtags = re.findall(hashtag_pattern, text)
        for hashtag in hashtags:
            entities.append(("Hashtag", hashtag))
        
        # Extract mentions
        mention_pattern = r'@\w+'
        mentions = re.findall(mention_pattern, text)
        for mention in mentions:
            entities.append(("Mention", mention))
        
        return entities
    
    def load_reddit_data(self, file_path):
        """Load Reddit data from a JSONL file and create graph database."""
        print(f"Loading data from {file_path}...")
        
        # First, clear existing data
        self.query("MATCH (n) DETACH DELETE n")
        
        # Create constraints and indexes
        self.create_constraints_and_indexes()
        
        # Batch processing
        batch_size = 100
        batch = []
        total_processed = 0
        
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    post = json.loads(line)
                    batch.append(post)
                    
                    if len(batch) >= batch_size:
                        self._process_batch(batch)
                        total_processed += len(batch)
                        print(f"Processed {total_processed} posts")
                        batch = []
                        
                except json.JSONDecodeError as e:
                    print(f"Error decoding JSON: {e}")
                    continue
        
        # Process any remaining posts
        if batch:
            self._process_batch(batch)
            total_processed += len(batch)
            
        print(f"Total posts processed: {total_processed}")
    
    def _process_batch(self, batch):
        """Process a batch of Reddit posts."""
        for post in batch:
            if "data" not in post:
                continue
                
            post_data = post["data"]
            
            if "name" not in post_data:
                continue
            
            # Create Post node
            self.query(
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
                self.query(
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
                self.query(
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
            selftext = post_data.get("selftext", "")
            title = post_data.get("title", "")
            
            if selftext or title:
                combined_text = f"{title} {selftext}"
                topics = self.extract_topics_from_text(combined_text)
                
                for topic in topics:
                    self.query(
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
                    
                # Extract and create Entity nodes
                entities = self.extract_entities(combined_text)
                
                for entity_type, entity_value in entities:
                    self.query(
                        """
                        MERGE (e:Entity {type: $type, value: $value})
                        WITH e
                        MATCH (p:Post {id: $post_id})
                        MERGE (p)-[:CONTAINS]->(e)
                        """,
                        {
                            "type": entity_type,
                            "value": entity_value,
                            "post_id": post_data.get("name", "")
                        }
                    )
            
            self.query(
                    """
                    MATCH (a1:Author)-[:AUTHORED_BY]->(p1:Post)-[:POSTED_IN]->(s:Subreddit)<-[:POSTED_IN]-(p2:Post)<-[:AUTHORED_BY]-(a2:Author)
                    WHERE a1.name <> a2.name
                    MERGE (a1)-[:INTERACTS_WITH]->(a2)
                    """,
                    {
                        "post_id": post_data.get("name", "")
                    }
                )
        
        print(f"Processed batch of {len(batch)} posts")

if __name__ == "__main__":
    neo4j_initializer = Neo4jInitializer(
        uri=os.getenv("NEO4J_URI", "bolt://localhost:7687"),
        user=os.getenv("NEO4J_USER", "neo4j"),
        password=os.getenv("NEO4J_PASSWORD", "Sameer4224")
    )
    
    neo4j_initializer.load_reddit_data("data/data.jsonl")
    
    neo4j_initializer.close()