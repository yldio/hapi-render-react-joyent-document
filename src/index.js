const { readFileSync } = require('fs');
const path = require('path');

const React = require('react');
const { renderToString, renderToNodeStream } = require('react-dom/server');
const { getDataFromTree } = require('react-apollo');
const { ServerStyleSheet } = require('styled-components');

const { default: Root } = require('./root');
const { default: Scripts } = require('./scripts');

module.exports = ({ theme, createClient, createStore, indexFile }) => {
  const html = readFileSync(indexFie, 'utf-8');
  const [pre, post] = html.split(/<div id="root"><\/div>/i);

  return async (request, response, View) => {
    const { req, res } = request.raw;

    res.write(pre);

    const location = req.url;
    const routerContext = {};
    const apolloClient = createClient({ ssrMode: true });
    const reduxStore = createStore();
    const sheet = new ServerStyleSheet();

    const _root = React.createElement(
      Root,
      {
        location,
        routerContext,
        reduxStore,
        apolloClient,
        sheet: sheet.instance,
        theme
      },
      React.createElement(View)
    );

    await getDataFromTree(_root);
    const root = sheet.collectStyles(_root);

    const stream = sheet.interleaveWithNodeStream(renderToNodeStream(root));

    stream.pipe(res, { end: false });
    stream.on('end', () => {
      const prepost = renderToString(
        React.createElement(Scripts, {
          apolloState: apolloClient.extract(),
          reduxState: reduxStore.getState(),
          redirect: routerContext.url
        })
      );

      res.end(`${prepost}${post}`);
    });

    return res;
  };
};
