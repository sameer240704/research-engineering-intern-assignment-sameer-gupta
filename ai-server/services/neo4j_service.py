import os
from python_types.types import Neo4jConnection
from dotenv import load_dotenv

load_dotenv()

neo4j_connection = Neo4jConnection(
    uri=os.getenv("NEO4J_URI"),
    user=os.getenv("NEO4J_USER"),
    password=os.getenv("NEO4J_PASSWORD")
)

def query_neo4j_for_general_stats(query_terms):
    """Get general statistics when no specific posts match the query"""
    try:
        cypher_query = """
        MATCH (p:Post)-[:POSTED_IN]->(s:Subreddit)
        RETURN s.name as subreddit, count(*) as post_count, 
               avg(p.score) as avg_score, sum(p.num_comments) as total_comments
        ORDER BY post_count DESC
        LIMIT 100
        """
        
        subreddit_results = neo4j_connection.query(cypher_query)
        
        cypher_query = """
        MATCH (p:Post)-[:DISCUSSES]->(t:Topic)
        RETURN t.name as topic, count(*) as mentions
        ORDER BY mentions DESC
        LIMIT 10
        """
        
        topic_results = neo4j_connection.query(cypher_query)
        
        context = "General Reddit statistics:\n\n"
        
        context += "Top Subreddits:\n"
        for i, record in enumerate(subreddit_results):
            context += f"{i+1}. r/{record['subreddit']}: {record['post_count']} posts, "
            context += f"avg score {record['avg_score']:.1f}, {record['total_comments']} comments\n"
        
        context += "\nPopular Topics:\n"
        for i, record in enumerate(topic_results):
            context += f"{i+1}. {record['topic']}: {record['mentions']} mentions\n"
        
        return context
    except:
        print("Error in fetching neo4j general stats")


def query_neo4j_for_context(query_terms, max_posts=10):
    """
    Query Neo4j database for posts related to the query terms.
    Returns formatted context string with relevant data.
    """
    try:
        term_conditions = []
        params = {}
        
        for i, term in enumerate(query_terms):
            param_name = f"term{i}"
            term_conditions.append(f"(p.title CONTAINS ${param_name} OR p.selftext CONTAINS ${param_name})")
            params[param_name] = term
        
        if not term_conditions:
            cypher_query = """
            MATCH (p:Post)-[:POSTED_IN]->(s:Subreddit)
            RETURN p.title as title, p.selftext as content, p.score as score, 
                   p.num_comments as comments, s.name as subreddit,
                   datetime({epochSeconds: toInteger(p.created_utc)}) as date
            ORDER BY p.score DESC
            LIMIT $limit
            """
            params = {"limit": max_posts}
        else:
            cypher_query = """
            MATCH (p:Post)-[:POSTED_IN]->(s:Subreddit)
            WHERE """ + " OR ".join(term_conditions) + """
            RETURN p.title as title, p.selftext as content, p.score as score, 
                   p.num_comments as comments, s.name as subreddit,
                   datetime({epochSeconds: toInteger(p.created_utc)}) as date
            ORDER BY p.score DESC
            LIMIT $limit
            """
            params["limit"] = max_posts
        
        results = neo4j_connection.query(cypher_query, params)
        
        if not results:
            return query_neo4j_for_general_stats(query_terms)
        
        context = "Relevant Reddit posts:\n\n"
        for i, record in enumerate(results):
            content = record["content"]
            if content and len(content) > 300:
                content = content[:300] + "..."
            
            context += f"Post {i+1}:\n"
            context += f"Title: {record['title']}\n"
            context += f"Subreddit: r/{record['subreddit']}\n"
            context += f"Score: {record['score']} | Comments: {record['comments']}\n"
            context += f"Date: {record['date']}\n"
            if content:
                context += f"Content: {content}\n"
            context += "\n---\n\n"
        
        context += get_statistical_summary(results)
        
        return context
    
    except Exception as e:
        return f"Error retrieving data from Neo4j: {str(e)}"
    
def get_statistical_summary(results):
    """Generate a statistical summary from the query results"""
    if not results:
        return ""

    subreddits = {}
    total_score = 0
    total_comments = 0
    
    for record in results:
        subreddit = record["subreddit"]
        subreddits[subreddit] = subreddits.get(subreddit, 0) + 1
        total_score += record["score"]
        total_comments += record["comments"]
    
    summary = "Statistical Summary:\n"
    summary += f"Total Posts: {len(results)}\n"
    summary += f"Average Score: {total_score / len(results):.1f}\n"
    summary += f"Average Comments: {total_comments / len(results):.1f}\n"
    
    summary += "Subreddit Distribution:\n"
    for subreddit, count in sorted(subreddits.items(), key=lambda x: x[1], reverse=True):
        percentage = (count / len(results)) * 100
        summary += f"- r/{subreddit}: {count} posts ({percentage:.1f}%)\n"
    
    return summary