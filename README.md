# BlogWebsiteDep
A full-stack blog platform built with Flask and React, offering a smooth writing and reading experience while keeping roles, permissions, and user interactions intuitive and secure.

# ✨ Key Features

# 🔐 Authentication & User Flow

Users must log in before creating a post — ensuring all posts are tied to verified accounts.

The very first registered user on a fresh database is automatically assigned Admin privileges.

# 🛠️ Admin Controls

Admin of current database is displayed on home screen along with the current user

Admin can pin and unpin posts to highlight important content.

Admin can delete any post or comment, giving full moderation control.

A dedicated Admin info bar appears when the admin is logged in (name + email displayed).

# 💬 Comments & User Identity

The current logged in user name and email appears on the home page

Every comment automatically displays a Gravatar avatar, generated from the user’s email.

Ensures a clean, recognizable identity system without storing image files.

# 📝 Post Creation

The New Post button automatically disables when the user logs out, preventing unauthorized creation.

Only logged-in users can access the /new-post route.

*Tech Stack*
  <!-- JavaScript -->
<img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black"/>
<!-- React -->
<img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB"/>
<!-- Express -->
<img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge&logo=express&logoColor=white"/>
<!-- Three.js -->
<img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white"/>

<img src="https://img.shields.io/badge/SQLAlchemy-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white"/>
<img src="https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white"/>
<img src="https://img.shields.io/badge/Flask-RESTful-000000?style=for-the-badge&logo=flask&logoColor=white"/>
