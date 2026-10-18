# How to Host GroupHub Locally with Production Firebase

This guide will walk you through setting up the GroupHub application on your local machine to run with a live, production Firebase backend for the database and authentication.

## Prerequisites

1.  **Node.js:** Make sure you have Node.js (version 18 or later) installed. You can download it from [nodejs.org](https://nodejs.org/).
2.  **npm:** npm (Node Package Manager) is included with Node.js.
3.  **Firebase Account:** You will need a Google account to create a Firebase project. It's free to get started.

## Step 1: Set Up Your Local Project

First, ensure you have all the project code on your local machine.

1.  **Install Dependencies:**
    Open your terminal, navigate to the project's root directory, and run the following command to install all the necessary packages:
    ```bash
    npm install
    ```

## Step 2: Set Up Your Firebase Project

This application requires a Firebase project to handle user authentication and the database.

1.  **Create a Firebase Project:**
    *   Go to the [Firebase Console](https://console.firebase.google.com/).
    *   Click on **"Add project"** and follow the on-screen instructions to create a new project.

2.  **Create a Web App in Firebase:**
    *   Inside your new Firebase project, click on the Web icon (`</>`) to add a new web application.
    *   Give your app a nickname (e.g., "GroupHub Local").
    *   **Do not** check the box for Firebase Hosting at this stage.
    *   Click **"Register app"**.

3.  **Get Firebase Configuration:**
    *   After registering, Firebase will show you your `firebaseConfig` object. It looks like this:
        ```javascript
        const firebaseConfig = {
          apiKey: "AIza...",
          authDomain: "your-project-id.firebaseapp.com",
          projectId: "your-project-id",
          storageBucket: "your-project-id.appspot.com",
          messagingSenderId: "...",
          appId: "1:...",
          measurementId: "G-..."
        };
        ```
    *   Keep this information handy. You'll need it for the next step.

4.  **Enable Firebase Services:**
    *   In the Firebase Console, go to the **"Build"** section in the left-hand menu.
    *   **Authentication:** Click on **Authentication**, then **"Get started"**. Enable the **Email/Password** and **Google** sign-in providers.
    *   **Firestore Database:** Click on **Firestore Database**, then **"Create database"**.
        *   Start in **production mode**.
        *   Choose a location for your database (e.g., `us-central`).
        *   Click **"Enable"**.

## Step 3: Configure Your Local Environment

You need to tell your local application how to connect to your new Firebase project.

1.  **Create an Environment File:**
    In the root directory of your project, create a new file named `.env.local`.

2.  **Add Firebase Configuration to the File:**
    Copy the following variable names into your `.env.local` file and paste the corresponding values from the `firebaseConfig` object you got in the previous step.

    ```bash
    NEXT_PUBLIC_FIREBASE_API_KEY="PASTE_YOUR_API_KEY_HERE"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="PASTE_YOUR_AUTH_DOMAIN_HERE"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="PASTE_YOUR_PROJECT_ID_HERE"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="PASTE_YOUR_STORAGE_BUCKET_HERE"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="PASTE_YOUR_MESSAGING_SENDER_ID_HERE"
    NEXT_PUBLIC_FIREBASE_APP_ID="PASTE_YOUR_APP_ID_HERE"
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="PASTE_YOUR_MEASUREMENT_ID_HERE"
    ```

    **Important:** Do not enclose the values in quotes.

## Step 4: Run the Application

Now you are ready to start the local development server.

1.  **Start the Server:**
    In your terminal, from the project's root directory, run:
    ```bash
    npm run dev
    ```

2.  **Open the App:**
    The application will typically be available at [http://localhost:9002](http://localhost:9002). Open this URL in your web browser.

You should now have the GroupHub website running locally, but all user data, groups, events, and messages will be read from and written to your production Firebase project in the cloud.