Package.describe({
  name: 'coniel:base-model',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: "A model for all other models to inherit from",
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/coniel/meteor-base-model',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom("1.0.2.1");

    api.use(["meteor", "mongo", "underscore"]);

    api.use([
        "aldeed:simple-schema@1.5.3",
        "aldeed:collection2@2.8.0"
    ]);

    api.imply(["meteor", "mongo", "underscore"]);

    api.imply([
        "aldeed:simple-schema@1.5.3",
        "aldeed:collection2@2.8.0"
    ]);

    api.addFiles(["base-model.js", "security.js"]);

    api.export("BaseModel");
});