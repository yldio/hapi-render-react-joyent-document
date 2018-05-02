import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { StaticRouter } from 'react-router';
import { ApolloProvider } from 'react-apollo';
import { ThemeProvider } from 'styled-components';
import { Provider } from 'react-redux';

export default ({
  location,
  helmetContext,
  routerContext,
  reduxStore,
  apolloClient,
  theme,
  children
}) => (
  <div id="root">
    <StaticRouter location={location} context={routerContext}>
      <Provider store={reduxStore}>
        <ApolloProvider client={apolloClient}>
          <ThemeProvider theme={theme}>
            <HelmetProvider context={helmetContext}>{children}</HelmetProvider>
          </ThemeProvider>
        </ApolloProvider>
      </Provider>
    </StaticRouter>
  </div>
);
