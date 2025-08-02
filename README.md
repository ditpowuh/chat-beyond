# ChatBeyond

This web application serves to create a familiar environment and be an alternative to ChatGPT. It uses OpenAI's developer API, allowing users to use OpenAI's stronger models without the need of paying a subscription.

The app is built with ease of use in mind, keeping everything very simple. Everything can be found within the directory of which the app is stored in.

> Note that this does NOT cover the cost of using the models.

Overview/Features:
- Able to use any of OpenAI's models (if technical users need a specific model, `models.js` can be modified)
- Locally stored conversations and data (in a place where it is easy to find and accessible)
- Estimates cost by calculating the number of tokens and applying the model's pricing
- Made to be lightweight as possible whilst maintaining ease of use and configurability
- UI built from the ground up

This app is recommended if you:
1. do not constantly use ChatGPT on a daily and a frequent basis
2. require a strong or stronger model from OpenAI

### Settings
The default model that is set is `gpt-4o`.
<br>
Note that you do not need to edit `settings.json` as all settings are configurable in the app itself.

### How to use
#### For Non-Programmers
1. Download the latest version of ChatBeyond from the [Releases](https://github.com/ditpowuh/chat-beyond/releases) section.
2. Extract the contents of the zip file that you have downloaded.
3. Prepare an API key if you have not done so already over at [OpenAI's website](https://platform.openai.com/).
4. Open the app and go to settings.
5. Put your API key in.

#### For Programmers
1. Install necessary Node.JS packages via `npm install`.
2. Prepare an API key if you have not done so already over at [OpenAI's website](https://platform.openai.com/).
3. Run the app (via `npm start`).
4. Go to settings and put your API key in.

### Technical Info
Settings, chats and files are stored within the `data` directory, which is created when the app is opened.

The models that are provided have been tested and are more than enough for layman/regular users' needs.
<br>
But if a specific model is required and you are a technical user, more models can be added by modifying `models.js`.

Project was run and tested with both `Node` and `Bun`. The executable produced in `Releases` were produced by `Bun`'s bundler.

> It should be noted that the cost calculator does not take tokens from reasoning into consideration.

### File Input
Images and PDF files are passed directly to OpenAI's API, whereas text files (`.txt`, `.docx`, `.js`, `.cs`, etc.) are extracted and passed as a text input.
<br>
A file size limit of 100 MB is imposed currently.

|     File Format    | Supported |
| ------------------ | :-------: |
| Text files            | ✅ |
| Code files            | ✅ |
| Images                | ✅ |
| Videos                | ❌ |
| Audio                 | ❌ |
| Documents             | ✅ |
| Spreadsheets          | ⚠️ |
| PDF files             | ✅ |
| Presentation files    | ❌ |
| Archive files         | ❌ |
| Executables           | ❌ |

⚠️ Spreadsheets - Excel spreadsheets are not supported, but `.csv` files are completely fine.

### Recommended Method for Updating
>  This is for the executable from [Releases](https://github.com/ditpowuh/chat-beyond/releases).

Extracting the new release, without deleting the older files, is generally fine, but is not the recommended method.
<br>
The recommended way of updating is to delete all files and folders except for `data` and then extract the new release as usual.

