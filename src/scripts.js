import React, { Fragment } from 'react';

export default ({ apolloState, reduxState, redirect }) => (
  <Fragment>
    {redirect ? (
      <script
        dangerouslySetInnerHTML={{ __html: `window.location = ${redirect}` }}
      />
    ) : null}

    <script
      dangerouslySetInnerHTML={{
        __html: `window.__APOLLO_STATE__=${JSON.stringify(apolloState).replace(
          /</g,
          '\\u003c'
        )};`
      }}
    />

    <script
      dangerouslySetInnerHTML={{
        __html: `window.__REDUX_STATE__=${JSON.stringify(reduxState).replace(
          /</g,
          '\\u003c'
        )};`
      }}
    />
  </Fragment>
);
