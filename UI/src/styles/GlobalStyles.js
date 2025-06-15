import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    font-size: 16px;
    
    @media (min-width: 1600px) {
      font-size: 18px;
    }
    
    @media (min-width: 2000px) {
      font-size: 20px;
    }
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background-color: #0d1117;
    color: #e6edf3;
    height: 100vh;
    overflow: hidden;
  }

  #root {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  button, input {
    font-family: inherit;
  }
  
  /* For Firefox scrollbar customization */
  * {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
  }
`;

export default GlobalStyles;