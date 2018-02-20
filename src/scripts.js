import React, { Fragment } from 'react';

export default ({ apolloState, reduxState, redirect }) => (
  <Fragment>
    {redirect ? (
      <meta httpEquiv="refresh" content={`0; url=${redirect}`} />
    ) : null}

    {apolloState ? (
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__APOLLO_STATE__=${JSON.stringify(
            apolloState
          ).replace(/</g, '\\u003c')};`
        }}
      />
    ) : null}

    {reduxState ? (
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__REDUX_STATE__=${JSON.stringify(reduxState).replace(
            /</g,
            '\\u003c'
          )};`
        }}
      />
    ) : null}
  </Fragment>
);
