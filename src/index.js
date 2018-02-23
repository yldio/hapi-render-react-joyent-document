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
    const prepost = renderToString(React.createElement(Scripts, props));
    res.end(`${prepost}${post}`);
  };

  const render = async ({ resStream, request, response, View }) => {
    let apolloClient;
    let routerContext;
    let reduxStore;
    let sheet;
    let root;

    try {
      const { theme, createClient, createStore } = getState(request, response);

      const location = request.path;
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

      return end(resStream, {
        redirect: `http://${request.info.host}/~server-error`
      });
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
