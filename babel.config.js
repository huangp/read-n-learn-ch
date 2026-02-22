module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Transform import.meta.url to a require statement
      function importMetaUrlPlugin({ types: t }) {
        return {
          visitor: {
            MetaProperty(path) {
              if (
                path.node.meta.name === 'import' &&
                path.node.property.name === 'meta'
              ) {
                // Replace import.meta with an object containing url
                path.replaceWith(
                  t.objectExpression([
                    t.objectProperty(
                      t.identifier('url'),
                      t.callExpression(t.identifier('require'), [
                        t.stringLiteral('./package.json'),
                      ])
                    ),
                  ])
                );
              }
            },
          },
        };
      },
    ],
  };
};