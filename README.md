# TAO Template Language Support

A Visual Studio Code extension that adds **language support** for the [TAO template engine](https://github.com/GreenFlag31/node-tao). Node-tao is a Nodejs template engine that focuses on performance, security, and developer experience.

![Presentation](https://raw.githubusercontent.com/GreenFlag31/tao-vscode-extension/main/assets/presentation.gif)

## ✨ Features

- **Tag completion** – Autocompletion for TAO template tags.
- **Include support** – Suggestions and signature help for `include(...)`.
- **Control structures** – Snippets and completions for `if`, `for`, `for-in`, and `for-of` with tags with syntax colors for html files.
- **User data injection** – Autocompletion for variables and helpers injected in the template.
- **Template names provider** – An `include` will suggest child templates of your project.
- **Template navigation** – Go to the file definition for an embedded child template in an `include`, hover to get the complete filepath.

## 📂 Configuration

If you want to override the default options, create a `tao.config.mjs` file at the root of your project and export your configuration as the default.

```javascript
/**
 * @type {import('tao-vscode-extension').Options}
 * These are the default options.
 */
const options = {
  extension: 'html', // extension of your template files
  parse: { exec: '', interpolate: '=', raw: '~' }, // parse configuration
  tags: { opening: '<%', closing: '%>' }, // tags configuration
  views: 'src', // folder where template files are stored
};

export default options;
```

## 🚀 Injected data in templates

Injected data in a template file (variables and helpers) are available for autocompletion.

```javascript
const displayName = (firstname, lastname) => `${firstname} ${lastname}`;
const result = tao.render(
  'template2.html',
  { firstname: 'John', lastname: 'Doe' },
  { displayName }
);
```

![Variable](https://raw.githubusercontent.com/GreenFlag31/tao-vscode-extension/main/assets/variable.png)

The data will be available **after** a specific render take place, since it has to be first injected.

_NB: Injected data is available only by setting Node-TAO in development mode._

## 🎨 Customize TAO tags colors

If you wish to change the colors of the tags, provide the following configuration in the `settings.json` file in the settings of vscode.

```json
"editor.tokenColorCustomizations": {
  "textMateRules": [
    {
      "scope": "punctuation.section.embedded.begin.tao",
      "settings": { "foreground": "#4faf43" }
    },
    {
      "scope": "punctuation.section.embedded.end.tao",
      "settings": { "foreground": "#4faf43" }
    }
  ]
}
```

## 🛠️ Requirements

Requires v0.0.3 of [node-tao](https://www.npmjs.com/package/node-tao) or higher.

## 🔧 Contributing

Issues and pull requests are welcome!  
👉 [GitHub repository](https://github.com/your-repo/tao-vscode-extension)

## 📄 License

[MIT](https://github.com/GreenFlag31/tao-vscode-extension/blob/main/LICENSE)
