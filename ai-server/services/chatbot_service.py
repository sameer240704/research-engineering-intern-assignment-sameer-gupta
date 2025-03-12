from python_types.types import ChatMessage
from groq import Client as GroqClient
import os
from dotenv import load_dotenv

load_dotenv()

def extract_query_terms(query):
    """
    Extract key search terms from user query for Neo4j searching.
    Returns a list of important terms.
    """
    import re
    
    query = query.lower()
    query = re.sub(r'[^\w\s]', '', query)
    
    stopwords = {'the', 'and', 'is', 'of', 'to', 'a', 'in', 'that', 'this', 'it', 
                 'for', 'on', 'with', 'as', 'by', 'what', 'how', 'when', 'where',
                 'who', 'why', 'can', 'could', 'would', 'should', 'will'}
    
    words = query.split()
    query_terms = [word for word in words if word not in stopwords and len(word) > 2]
    
    if len(query_terms) < 2:
        query_terms = [word for word in words if len(word) > 2][:5]
    
    return query_terms

def generate_groq_response_with_model(prompt, model_name, max_tokens=1000):
    """Generate a response using a specified Groq model."""
    try:
        groq_client = GroqClient(api_key=os.getenv("GROQ_API_KEY"))

        response = groq_client.chat.completions.create(
            model=model_name, 
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=0.7,
            top_p=0.9
        )
        
        return response.choices[0].message.content
    except Exception as e:
        return f"Error generating response with {model_name}: {str(e)}"
    
# This function is just for better user answer as user can ask for short or detailed answers
def detect_response_length(user_message):
    """
    Detect whether the user wants a concise or detailed response based on their prompt.
    Returns "concise" or "detailed".
    """
    concise_keywords = {"one sentence", "brief", "short", "quick", "summarize", "in a nutshell"}
    detailed_keywords = {"detailed", "explain", "analyze", "break down", "in depth", "elaborate"}
    
    user_message = user_message.lower()
    
    if any(keyword in user_message for keyword in concise_keywords):
        return "concise"
    elif any(keyword in user_message for keyword in detailed_keywords):
        return "detailed"
    else:
        return "concise"