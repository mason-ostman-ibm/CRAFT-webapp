import { useEffect, useRef } from 'react';

// Watson Orchestrate configuration
declare global {
  interface Window {
    wxOConfiguration?: any;
    wxoLoader?: any;
  }
}

const WatsonOrchestrate = () => {
  const isInitialized = useRef(false);

  useEffect(() => {
    // Only initialize once
    if (isInitialized.current) return;
    isInitialized.current = true;

    const initializeWatson = async () => {
      try {
        console.log('🚀 Initializing Watson Orchestrate for Excel AI Processor...');
        
        // Get user email from OAuth2 proxy headers
        const userResponse = await fetch('/api/user');
        const userData = await userResponse.json();
        const userEmail = userData.email;
        
        console.log('👤 User email:', userEmail || 'Not available');

        // Create dedicated container for Watson Orchestrate
        const chatContainer = document.createElement('div');
        chatContainer.id = 'watson-orchestrate-container';
        chatContainer.style.cssText = `
          position: fixed;
          bottom: 0;
          right: 0;
          z-index: 10000;
          pointer-events: auto;
        `;
        
        document.body.appendChild(chatContainer);
        console.log('✅ Container created:', chatContainer.id);

        // Build context-aware system prompt for Excel AI Processor
        const contextPrompt = `You are a helpful AI assistant for the Excel AI Processor application.

ABOUT THIS APPLICATION:
- Users can upload Excel files with questions and answers
- AI automatically fills in missing answers using WatsonX.ai
- Supports validation and download of completed files
- Uses RAG (Retrieval-Augmented Generation) for better answers

YOU CAN HELP WITH:
- How to upload and process Excel files
- Understanding the AI processing workflow
- Troubleshooting file upload issues
- Explaining validation results
- Tips for better AI-generated answers
- Questions about supported file formats
- How to add context for better results

CURRENT USER: ${userEmail || 'Anonymous'}

Be concise, helpful, and guide users through the Excel processing workflow.`;

        // Watson Orchestrate configuration
        // TODO: Replace with your actual orchestration ID and agent ID
        window.wxOConfiguration = {
          orchestrationID: "YOUR_ORCHESTRATION_ID",
          hostURL: "https://us-south.watson-orchestrate.cloud.ibm.com",
          rootElementID: "watson-orchestrate-container",
          deploymentPlatform: "ibmcloud",
          crn: "YOUR_CRN",
          chatOptions: {
            agentId: "YOUR_AGENT_ID",
            agentEnvironmentId: "YOUR_ENVIRONMENT_ID",
            ...(userEmail && {
              sessionVariables: {
                user: {
                  email: userEmail
                }
              }
            }),
            context: {
              global: {
                system: {
                  context: contextPrompt
                }
              }
            }
          }
        };
        
        console.log('✅ Watson Orchestrate Configuration:');
        console.log('  - Agent ID:', window.wxOConfiguration.chatOptions.agentId);
        console.log('  - User Email:', userEmail || 'Not available');

        // Load Watson Orchestrate script
        setTimeout(function () {
          const script = document.createElement('script');
          script.src = `${window.wxOConfiguration.hostURL}/wxochat/wxoLoader.js?embed=true`;
          script.addEventListener('load', function () {
            console.log('✅ Watson Orchestrate script loaded');
            window.wxoLoader.init();
            console.log('✅ Watson Orchestrate initialized successfully');
          });
          script.addEventListener('error', function(e) {
            console.error('❌ Failed to load Watson Orchestrate script:', e);
          });
          document.head.appendChild(script);
          console.log('📥 Script tag added to document');
        }, 0);

      } catch (error) {
        console.error('❌ Error initializing Watson Orchestrate:', error);
      }
    };

    // Initialize immediately
    initializeWatson();

    // Cleanup function
    return () => {
      const container = document.getElementById('watson-orchestrate-container');
      if (container) {
        container.remove();
      }
    };
  }, []);

  // This component doesn't render anything visible
  return null;
};

export default WatsonOrchestrate;

// Made with Bob
