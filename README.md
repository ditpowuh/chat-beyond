# ChatBeyond

This web application serves to create a familiar environment and be an alternative to ChatGPT. It uses OpenAI's developer API, allowing layman/regular users to use OpenAI's stronger models without the need of paying a subscription.

The app is built with ease of use in mind, keeping everything very simple. Everything can be found within the directory of which the app is stored in.

> Note that this does NOT cover the cost of using the models.

Overview/Features:
- Able to use any of OpenAI's models (if users need a specific model, `models.json` can be modified)
- Locally stored conversations and data (in a place where it is easy to find and accessible)
- Estimates cost by calculating the number of tokens and applying the model's pricing
- Made to be lightweight as possible
- UI built from the ground up

This app is recommended if you:
1. do not constantly use ChatGPT on a daily and a frequent basis
2. require a strong or stronger model from OpenAI

### Settings
The default model that is set is `gpt-4o`.
<br>
Note that you do not need to edit `settings.json` as all settings are configurable in the app itself.

### Technical Info
Settings and chats are stored within the `data` directory, which is created when the app is opened.

The models that are provided have been tested and are more than enough for layman/regular users' needs.
<br>
But if a specific model is required and you are a technical user, you may add more via `models.json`.

Project was run and tested with both `Node` and `Bun`. The executable produced in `Releases` were produced by `Bun`'s bundler. 
