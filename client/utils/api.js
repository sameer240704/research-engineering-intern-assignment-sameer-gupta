import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

export async function initDatabase() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/init-database`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

export const fetchTimeSeries = async (query, startDate, endDate, subreddits) => {
    const response = await axios.get(`${API_BASE_URL}/api/time-series`, {
        // params: { query, start_date: startDate, end_date: endDate, subreddits },
    });
    return response.data;
};

export const fetchCommunityDistribution = async (query, startDate, endDate) => {
    const response = await axios.get(`${API_BASE_URL}/api/community-distribution`, {
        // params: { query, start_date: startDate, end_date: endDate },
    });
    return response.data;
};

export const fetchNetworkGraph = async (query, startDate, endDate, subreddits, limit) => {
    const response = await axios.get(`${API_BASE_URL}/api/network-graph`, {
        // params: { query, start_date: startDate, end_date: endDate, subreddits, limit },
    });
    return response.data;
};

export const fetchAIAnalysis = async (searchQuery) => {
    const response = await axios.post(`${API_BASE_URL}/api/ai-analysis`, searchQuery);
    return response.data;
};

export const sendChatMessage = async (message) => {
    const response = await axios.post(`${API_BASE_URL}/api/chatbot`, { message });
    return response.data;
};