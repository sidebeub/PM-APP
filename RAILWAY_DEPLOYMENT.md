# Railway Deployment Guide

## Environment Variables Required

Set these environment variables in your Railway project:

### Database Configuration
```
DB_USER=Zach
DB_HOST=backupapril272025.cdc2o6m8gcel.us-west-2.rds.amazonaws.com
DB_NAME=project_management
DB_PASSWORD=Rayne22!
DB_PORT=5432
```

### BOM Database Configuration
```
BOM_DB_USER=Zach
BOM_DB_HOST=backupapril272025.cdc2o6m8gcel.us-west-2.rds.amazonaws.com
BOM_DB_NAME=BOMs
BOM_DB_PASSWORD=Rayne22!
BOM_DB_PORT=5432
```

### JWT Configuration
```
JWT_SECRET=project_management_app_secret_key_2025
```

### Node Environment
```
NODE_ENV=production
```

## Deployment Steps

1. Push your code to GitHub
2. Connect your GitHub repository to Railway
3. Set the environment variables above
4. Deploy!

Railway will automatically:
- Install dependencies with `npm install`
- Build the React app with `npm run build`
- Start the server with `npm start`
