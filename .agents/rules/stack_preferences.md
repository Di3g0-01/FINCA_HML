# Default Tech Stack and Behavior Guidelines

When the user asks to build, design, or extend a web application, you MUST default to the following technology stack and guidelines unless explicitly told otherwise:

1.  **Frontend Framework (React)**:
    *   Always default to **React** for building user interfaces.
    *   Follow modern React best practices (Hooks, functional components, proper state management).
    *   Repository reference: [React](https://github.com/facebook/react)

2.  **Styling (Bootstrap)**:
    *   Always default to **Bootstrap** for styling and responsive design.
    *   Avoid writing custom CSS when a Bootstrap utility class or component can achieve the same result.
    *   Repository reference: [Bootstrap](https://github.com/twbs/bootstrap)

3.  **External Data and Integrations (Public APIs)**:
    *   When the application requires external data (e.g., weather, placeholders, dummy data for testing, currency rates), default to searching and integrating a suitable free API from the Public APIs list.
    *   Repository reference: [Public APIs](https://github.com/public-apis/public-apis)

**General Instruction**:
Apply these preferences proactively. You do not need the user to remind you to use React or Bootstrap. When asked to "create a web app" or "build a new view", immediately assume this stack.
