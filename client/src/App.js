import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const App = () => {
  // State management for chat functionality
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: '🏠 **Which city/area are you looking to buy in?**',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConversationComplete, setIsConversationComplete] = useState(false);
  const [classification, setClassification] = useState(null);
  const [currentOptions, setCurrentOptions] = useState(null);
  const [currentQuestionType, setCurrentQuestionType] = useState('text');

  // Refs for smooth scrolling and input management
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Smooth scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end'
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input on component mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Send message to backend
  const sendMessage = async (messageText = null) => {
    const messageToSend = messageText || inputMessage.trim();
    if (!messageToSend || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: messageToSend,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setCurrentOptions(null); // Hide options after selection

    try {
      // Validate message length before sending
      if (userMessage.content.length > 1000) {
        throw new Error('Message is too long. Please keep it under 1000 characters.');
      }

      let response;
      try {
        const apiUrl = process.env.NODE_ENV === 'production' 
          ? '/.netlify/functions/chat' 
          : 'http://localhost:3000/chat';
        
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            message: userMessage.content,
            transcript: messages // Send full conversation history
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
      } catch (networkError) {
        console.error('Network error:', networkError);
        if (networkError.name === 'AbortError') {
          throw new Error('Request timed out. The server might be busy. Please try again.');
        }
        throw new Error('Unable to connect to the server. Please check your internet connection and try again.');
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        throw new Error('Received invalid response from server. Please try again.');
      }

      // Handle different HTTP status codes
      if (!response.ok) {
        let errorMessage = 'Something went wrong. Please try again.';
        
        if (response.status === 400) {
          errorMessage = data.error || 'Invalid message format. Please try again.';
        } else if (response.status === 429) {
          errorMessage = 'Service is busy. Please wait a moment and try again.';
        } else if (response.status === 500) {
          errorMessage = data.error || 'Server error. Please try again later.';
        } else if (response.status >= 500) {
          errorMessage = 'Service is temporarily unavailable. Please try again later.';
        }
        
        throw new Error(errorMessage);
      }

      if (data.success) {
        // Add bot response with animation delay
        setTimeout(() => {
          const botMessage = {
            id: Date.now() + 1,
            role: 'assistant',
            content: data.reply,
            timestamp: new Date().toISOString()
          };
          
          setMessages(prev => [...prev, botMessage]);
          
          // Handle interactive options
          if (data.options && data.questionType === 'buttons') {
            setCurrentOptions(data.options);
            setCurrentQuestionType('buttons');
          } else {
            setCurrentOptions(null);
            setCurrentQuestionType('text');
          }
          
          // Check if conversation is complete
          if (data.isComplete && data.classification) {
            setIsConversationComplete(true);
            setClassification(data.classification);
          }
          
          setIsLoading(false);
        }, 800); // Slight delay for natural conversation feel
      } else {
        // Handle specific error codes from the API
        let userFriendlyError = data.error || 'Failed to send message';
        
        if (data.code === 'CLAUDE_ERROR') {
          userFriendlyError = 'AI service is temporarily unavailable. Please try again.';
        } else if (data.code === 'RATE_LIMIT') {
          userFriendlyError = 'Service is busy. Please wait a moment and try again.';
        } else if (data.code === 'AUTH_ERROR') {
          userFriendlyError = 'Service authentication failed. Please contact support.';
        } else if (data.code === 'MESSAGE_TOO_LONG') {
          userFriendlyError = 'Message is too long. Please keep it shorter.';
        } else if (data.code === 'EMPTY_MESSAGE') {
          userFriendlyError = 'Please enter a message.';
        } else if (data.code === 'TIMEOUT_ERROR') {
          userFriendlyError = 'Request timed out. Please try again.';
        }
        
        throw new Error(userFriendlyError);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Create user-friendly error message
      let errorContent = error.message;
      if (!errorContent || errorContent.includes('fetch')) {
        errorContent = 'Unable to send message. Please check your connection and try again.';
      }
      
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `⚠️ ${errorContent}`,
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  // Handle button click for multiple choice options
  const handleButtonClick = (option) => {
    sendMessage(option);
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Format message content for better display
  const formatMessageContent = (content) => {
    // Convert **text** to bold
    const formattedContent = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return { __html: formattedContent };
  };

  // Reset conversation with enhanced error handling
  const resetConversation = async () => {
    try {
      console.log('🔄 Resetting conversation...');
      
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? '/.netlify/functions/reset' 
        : 'http://localhost:3000/reset';
      
      // Add timeout for reset as well
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for reset
      
      const response = await fetch(apiUrl, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Reset failed with status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to reset conversation');
      }

      console.log('✅ Conversation reset successfully');
      
      setMessages([
        {
          id: 1,
          role: 'assistant',
          content: '🏠 **Which city/area are you looking to buy in?**',
          timestamp: new Date().toISOString()
        }
      ]);
      setIsConversationComplete(false);
      setClassification(null);
      setCurrentOptions(null);
      setCurrentQuestionType('text');
      setInputMessage('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error resetting conversation:', error);
      
      // Show error message to user
      const errorMessage = {
        id: Date.now(),
        role: 'assistant',
        content: '⚠️ Unable to reset conversation. Please refresh the page to start over.',
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <div className="chat-header">
        <div className="header-content">
          <div className="header-info">
            <div className="header-icon">
              🏠
            </div>
            <div className="header-text">
              <h1 className="header-title">GrowEasy Real Estate</h1>
              <p className="header-subtitle">
                <span className="status-dot"></span>
                AI Property Assistant
              </p>
            </div>
          </div>
          <button 
            onClick={resetConversation}
            className="reset-button"
            title="Start New Conversation"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Chat Container */}
      <div className="chat-container">
        <div className="messages-container">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`message-wrapper ${message.role === 'user' ? 'user-message' : 'bot-message'}`}
              style={{
                animationDelay: `${index * 0.1}s`
              }}
            >
              <div className={`message-bubble ${message.role}`}>
                <div 
                  className="message-content"
                  dangerouslySetInnerHTML={formatMessageContent(message.content)}
                />
                <div className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>
          ))}
          
          {/* Interactive Options Buttons */}
          {currentOptions && currentQuestionType === 'buttons' && !isLoading && !isConversationComplete && (
            <div className="options-container">
              <div className="options-grid">
                {currentOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleButtonClick(option)}
                    className="option-button"
                    style={{
                      animationDelay: `${index * 0.1}s`
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="message-wrapper bot-message">
              <div className="message-bubble assistant loading">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          {/* Classification result */}
          {isConversationComplete && classification && (
            <div className="classification-result">
              <div className="classification-header">
                <h3>🎯 Lead Classification</h3>
              </div>
              <div className="classification-content">
                <div className={`status-badge ${classification.status}`}>
                  {classification.status.toUpperCase()}
                </div>
                {classification.metadata && (
                  <div className="metadata">
                    {Object.entries(classification.metadata).map(([key, value]) => 
                      value && (
                        <div key={key} className="metadata-item">
                          <span className="metadata-key">{key}:</span>
                          <span className="metadata-value">{value}</span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Smooth scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Container */}
      <div className="input-container">
        <div className="input-wrapper">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={currentQuestionType === 'buttons' ? "Choose an option above or type your response..." : "Type your message..."}
            className="message-input"
            disabled={isLoading || isConversationComplete}
            rows={1}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!inputMessage.trim() || isLoading || isConversationComplete}
            className="send-button"
          >
            {isLoading ? (
              <div className="loading-spinner"></div>
            ) : (
              "➤"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
