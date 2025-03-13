import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const fetchTimeSeries = async (query, startDate, endDate, subreddits) => {
    const response = await axios.get(`${API_BASE_URL}/api/time-series`, {
        params: { query, start_date: startDate, end_date: endDate, subreddits },
    });
    return response.data;
};

export const fetchCommunityDistribution = async (query, startDate, endDate) => {
    const response = await axios.get(`${API_BASE_URL}/api/community-distribution`, {
        params: { query, start_date: startDate, end_date: endDate },
    });
    return response.data;
};

export const fetchNetworkGraph = async (query, startDate, endDate, subreddits, limit) => {
    const response = await axios.get(`${API_BASE_URL}/api/network-graph`, {
        params: { query, start_date: startDate, end_date: endDate, subreddits, limit },
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

export const fetchTopicTrends = async (startDate, endDate, subreddits) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/topic-trends`, {
            params: { start_date: startDate, end_date: endDate, subreddits },
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching topic trends:", error);
        throw error;
    }
};