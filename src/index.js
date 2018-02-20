const { readFileSync } = require('fs');

const React = require('react');
const { renderToString, renderToNodeStream } = require('react-dom/server');
const { getDataFromTree } = require('react-apollo');
const { ServerStyleSheet } = require('styled-components');

const { default: Root } = require('./root');
const { default: Scripts } = require('./scripts');

module.exports = ({ indexFile, getState }) => {
  const html = readFileSync(indexFile, 'utf-8');
  const [pre, post] = html.split(/<div id="root"><\/div>/i);

  const end = (res, props) => {
    const prepost = renderToString(React.createElement(Scripts, props));
    res.end(`${prepost}${post}`);
  };

  return async (request, response, View) => {
    const { req, res } = request.raw;

    res.write(pre);

    let apolloClient;
    let routerContext;
    let reduxStore;
    let sheet;
    let root;

    try {
      const { theme, createClient, createStore } = getState(request, response);

      const location = req.url;
      routerContext = {};
      apolloClient = createClient({ ssrMode: true });
      reduxStore = createStore();
      sheet = new ServerStyleSheet();

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
      root = sheet.collectStyles(_root);
    } catch (err) {
      console.log(err);
      end(res, { redirect: `http://${req.headers.host}/~server-error` });
      return res;
    }

    const stream = sheet.interleaveWithNodeStream(renderToNodeStream(root));

    stream.on('error', err => console.error(err));
    stream.pipe(res, { end: false });

    stream.on('end', () =>
      end(res, {
        apolloState: apolloClient.extract(),
        reduxState: reduxStore.getState(),
        redirect:
          routerContext.url && `http://${req.headers.host}${routerContext.url}`
      })
    );

    return res;
  };
};
