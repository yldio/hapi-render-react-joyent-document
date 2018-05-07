const React = require('react');
const { renderToNodeStream } = require('react-dom/server');
const { getDataFromTree } = require('react-apollo');
const { ServerStyleSheet } = require('styled-components');
const Duplexify = require('duplexify');
const Str = require('string-to-stream');
const Pumpify = require('pumpify');

const { default: Root } = require('./root');
const { default: Scripts } = require('./scripts');

module.exports = ({ namespace = '', Html, getState }) => async (
  request,
  response,
  View
) => {
  const location = request.path;

  let helmetContext;
  let apolloClient;
  let routerContext;
  let reduxStore;
  let sheet;
  let root;
  let post;

  try {
    const { theme, createClient, createStore } = getState(request, response);

    routerContext = {};
    helmetContext = {};
    apolloClient = createClient({ ssrMode: true });
    reduxStore = createStore();
    sheet = new ServerStyleSheet();

    const _root = React.createElement(
      Root,
      {
        location,
        helmetContext,
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

    post = React.createElement(Scripts, {
      apolloState: apolloClient.extract(),
      reduxState: reduxStore.getState(),
      redirect:
        routerContext.url &&
        `http://${request.info.host}${routerContext.url}${request.url.search ||
          ''}`
    });
  } catch (err) {
    console.error(err);

    post = React.createElement(Scripts, {
      redirect:
        !location.match(/^\/~server-error/) &&
        `http://${request.info.host}${namespace}~server-error`
    });
  }

  const { helmet = {} } = helmetContext;

  const {
    bodyAttributes,
    htmlAttributes,
    link,
    meta,
    noscript,
    script,
    style,
    title
  } = helmet;

  const _html = Html.default || Html;

  const html = renderToNodeStream(
    React.createElement(
      _html,
      {
        htmlAttrs: htmlAttributes && htmlAttributes.toComponent(),
        bodyAttrs: bodyAttributes && bodyAttributes.toComponent(),
        head: [
          ...meta.toComponent(),
          ...link.toComponent(),
          ...title.toComponent(),
          sheet.getStyleElement()
        ]
      },
      [
        root,
        post,
        ...noscript.toComponent(),
        ...script.toComponent(),
        ...style.toComponent(),
        React.createElement('script', {
          type: 'text/javascript',
          src: `/${namespace}static/main.js`
        })
      ].filter(Boolean)
    )
  );

  return Pumpify(Duplexify(Str('<!DOCTYPE html>')), html);
};
