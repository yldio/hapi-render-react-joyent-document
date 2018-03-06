const { readFileSync } = require('fs');

const React = require('react');
const { renderToString, renderToNodeStream } = require('react-dom/server');
const { getDataFromTree } = require('react-apollo');
const { ServerStyleSheet } = require('styled-components');
const Through = require('through2');

const { default: Root } = require('./root');
const { default: Scripts } = require('./scripts');

module.exports = ({ namespace = '', assets = {}, indexFile, getState }) => {
  const html = readFileSync(indexFile, 'utf-8');
  const [_pre, _post] = html.split(/<div id="root"><\/div>/i);
  const hasNoscript = /<noscript>/.test(html);

  const pre = Object.values(assets).reduce(
    (pre, val) => pre.replace(val, `${namespace}${val}`),
    _pre
  );
  const post = Object.values(assets).reduce(
    (post, val) => post.replace(val, `${namespace}${val}`),
    _post
  );

  const end = (res, props) => {
    try {
      const prepost = renderToString(React.createElement(Scripts, props));
      res.end(`${prepost}${post}`);
    } catch (err) {
      console.error(err);

      try {
        res.end();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const render = async ({ resStream, request, response, View }) => {
    const location = request.path;

    let apolloClient;
    let routerContext;
    let reduxStore;
    let sheet;
    let root;

    try {
      const { theme, createClient, createStore } = getState(request, response);

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
      console.error(err);

      const redirect =
        !location.match(/^\/\~server-error/) &&
        `http://${request.info.host}${namespace}~server-error`;

      if (!hasNoscript) {
        resStream.write(
          '<noscript>An error occurred while loading your page.</noscript>'
        );
      }

      resStream.write('<div id="root"></div>');

      return end(resStream, { redirect });
    }

    const stream = sheet.interleaveWithNodeStream(renderToNodeStream(root));

    stream.on('error', err => console.error(err));
    stream.pipe(resStream, {
      end: false
    });

    stream.on('end', () => {
      return end(resStream, {
        apolloState: apolloClient.extract(),
        reduxState: reduxStore.getState(),
        redirect:
          routerContext.url && `http://${request.info.host}${routerContext.url}${request.url.search || ''}`
      })
    });
  };

  return async (request, response, View) => {
    const resStream = Through();

    resStream.write(pre);

    setImmediate(render, {
      resStream,
      request,
      response,
      View
    });

    return resStream;
  };
};
