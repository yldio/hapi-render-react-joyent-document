const { readFileSync } = require('fs');

const React = require('react');
const { renderToString, renderToNodeStream } = require('react-dom/server');
const { getDataFromTree } = require('react-apollo');
const { ServerStyleSheet } = require('styled-components');
const Through = require('through2');

const { default: Root } = require('./root');
const { default: Scripts } = require('./scripts');

module.exports = ({ indexFile, getState }) => {
  const html = readFileSync(indexFile, 'utf-8');
  const [pre, post] = html.split(/<div id="root"><\/div>/i);

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
        `http://${request.info.host}/~server-error`;

      resStream.write('<div id="root"></div>');
      return end(resStream, { redirect });
    }

    const stream = sheet.interleaveWithNodeStream(renderToNodeStream(root));

    stream.on('error', err => console.error(err));
    stream.pipe(resStream, {
      end: false
    });

    stream.on('end', () =>
      end(resStream, {
        apolloState: apolloClient.extract(),
        reduxState: reduxStore.getState(),
        redirect:
          routerContext.url && `http://${request.info.host}${routerContext.url}`
      })
    );
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
