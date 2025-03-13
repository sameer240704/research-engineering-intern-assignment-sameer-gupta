from neo4j import GraphDatabase
import json
import os
import re
from collections import Counter
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed

load_dotenv()

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
        """Extract meaningful topics from text using improved preprocessing and filtering."""
        if not text or len(text) < 50:
            return []

        cleaned_text = re.sub(r'[^\w\s]', '', text.lower())  
        cleaned_text = re.sub(r'\s+', ' ', cleaned_text) 

        words = word_tokenize(cleaned_text)
        stop_words = set(stopwords.words('english'))
        filtered_words = [
            word for word in words
            if word not in stop_words and len(word) > 2 and word.isalpha()
        ]

        filtered_words = [
            word for word in filtered_words
            if not self._is_repetitive_or_noisy(word)
        ]

        word_freq = Counter(filtered_words)
        return [word for word, _ in word_freq.most_common(num_topics)]

    def _is_repetitive_or_noisy(self, word):
        """Check if a word is repetitive or noisy (e.g., 'ssssssssswswwwwwsswws')."""
        if len(set(word)) < 3: 
            return True

        if re.match(r'^(.)\1*(.)\2*$', word):  
            return True

        return False
    
    def extract_entities(self, text):
        """Extract entities from text using simple pattern matching."""
        entities = []
        
        url_pattern = r'https?://\S+'
        urls = re.findall(url_pattern, text)
        for url in urls:
            entities.append(("URL", url))
        
        hashtag_pattern = r'#\w+'
        hashtags = re.findall(hashtag_pattern, text)
        for hashtag in hashtags:
            entities.append(("Hashtag", hashtag))
        
        mention_pattern = r'@\w+'
        mentions = re.findall(mention_pattern, text)
        for mention in mentions:
            entities.append(("Mention", mention))
        
        return entities
    
    def load_reddit_data(self, file_path):
        """Load Reddit data from a JSONL file and create graph database."""
        print(f"Loading data from {file_path}...")
        
        self.query("MATCH (n) DETACH DELETE n")
        
        self.create_constraints_and_indexes()
        
        batch_size = 1000
        total_processed = 0
        
        with open(file_path, 'r', encoding='utf-8') as f:
            batch = []
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
        
        if batch:
            self._process_batch(batch)
            total_processed += len(batch)
            
        print(f"Total posts processed: {total_processed}")
    
    def _process_batch(self, batch):
        """Process a batch of Reddit posts."""
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(self._process_post, post) for post in batch]
            for future in as_completed(futures):
                future.result()
    
    def _process_post(self, post):
        """Process a single Reddit post."""
        if "data" not in post:
            return
            
        post_data = post["data"]
        
        if "name" not in post_data:
            return
        
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

if __name__ == "__main__":
    neo4j_initializer = Neo4jInitializer(
        uri=os.getenv("NEO4J_URI"),
        user=os.getenv("NEO4J_USER"),
        password=os.getenv("NEO4J_PASSWORD")
    )
    
    neo4j_initializer.load_reddit_data("data/data.jsonl")
    
    neo4j_initializer.close()