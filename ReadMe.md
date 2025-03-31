# Backend for Trainee Project

This is the backend setup for the Trainee project. It provides the necessary configurations and APIs required for the frontend.

---

## Requirements - Versions

- **Node.js**: 22.14.0 (Use NVM for installation on Ubuntu)
- **npm**: 10.9.2
- **MySQL**: 8.0

---
## Node.js Installation (Ubuntu)

To install Node.js on Ubuntu, we recommend using `nvm` (Node Version Manager) to manage different versions of Node.js.

### Steps:

1. **Install NVM:**

   Open your terminal and run:

   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
   ```

2. **Close and Reopen Terminal** or run:

   ```bash
   source ~/.bashrc
   ```

3. **Install Node.js Version 22.14.0:**

   ```bash
   nvm install 22.14.0
   ```

4. **Set Node.js Version:**

   After installation, set Node.js version 22.14.0 to be used by default:

   ```bash
   nvm use 22.14.0
   ```

5. **Verify Installation:**

   You can verify that Node.js and npm have been successfully installed by running:

   ```bash
   node -v
   npm -v
   ```

### For Other Operating Systems:

For installation instructions for other operating systems (macOS, Windows), follow the links below:

- [Installing NVM for macOS](https://github.com/nvm-sh/nvm#install--update-script)
- [Installing NVM for Windows](https://github.com/coreybutler/nvm-windows)


## Installation Guide

### 1. Clone the Repository

First, clone the backend repository:

```bash
git clone <url>
cd trainee_backend_nodejs
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory of the project with the following contents:

```plaintext
PORT=your_port_here
DBHOST=your_database_host_here
DBUSER=your_database_user_here
DBPASSWORD=your_database_password_here
DATABASE=your_database_name_here
JWT_SECRET=your_jwt_seassion_secret
JWT_EXPIRE=7d
```

Make sure to replace the placeholders (`your_port_here`, `your_database_host_here`, `your_database_user_here`, `your_database_password_here`, `your_database_name_here`) with the actual values for your environment.

### 3. Install Dependencies

Run the following command to install all the necessary dependencies:

```bash
npm install
```

Or with `yarn`:

```bash
yarn install
```

### 4. Backend Seeding

Run this Backend Seeding Script 

```bash
npm run seed
```

Or with `yarn`:

```bash
yarn run seed
```

### 5. Start the Server

After installing dependencies, you can start the backend server:

```bash
npm start
```

Or with `yarn`:

```bash
yarn start
```


### 5. Build the Application

After installing dependencies, you can build the backend server:

```bash
npm run build
```

Or with `yarn`:

```bash
yarn run build
```

docker run --network backend-network \
  --name redis-stack \
  -p 6379:6379 -p 8001:8001 \
  -v redis:/var/lib/redis \
  -d redis:latest


docker run --network backend-network \
  --name mysql-samp \
  -e MYSQL_ROOT_PASSWORD=Passwd@1234 \
  -e MYSQL_DATABASE=mydb \
  -e MYSQL_USER=mysqluser \
  -e MYSQL_PASSWORD=Passwd@1234 \
  -v mydb:/var/lib/mysql \
  -d mysql:latest


docker run --network backend-network \
  -e PORT=3300 \
  -e DBHOST=mysql-samp \
  -e DBUSER=mysqluser \
  -e DBPASSWORD=Passwd@1234 \
  -e DATABASE=mydb \
  -e JWT_SECRET=jwt_secret \
  -e JWT_EXPIRE=7d\
  -p 3300:3300 \
  karmpatel/backend


docker run --network backend-network \
  -e PORT=3300 \
  -e DBHOST=mysql-samp \
  -e DBUSER=mysqluser \
  -e DBPASSWORD=Passwd@1234 \
  -e DATABASE=mydb \
  -e JWT_SECRET=jwt_secret \
  -e JWT_EXPIRE=7d\
  karmpatel/backend2

docker run -e PORT=3300 -e DBHOST='localhost' -e DBUSER='sqluser' -e DBPASSWORD='Passwd@1234' -e DATABASE='mydb' -e JWT_SECRET='jwtsessions' -e JWT_EXPIRE='7d' --network=host karmpatel/backend


docker run -e VITE_BACKENDURL=http://localhost:3300 --network backend-network  -p 5173:5173 karmpatel/frontend2

docker run -e VITE_BACKENDURL=http://localhost:3300 --network backend-network  -p 5173:5173 karmpatel/frontendm