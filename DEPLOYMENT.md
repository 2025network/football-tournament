# AfriKick DigitalOcean VPS Deployment Guide

This guide prepares AfriKick for a DigitalOcean VPS running Ubuntu 24.04, Node.js, PostgreSQL, PM2, Nginx, and HTTPS with Certbot.

Do not run production commands until you have a domain name, production environment variables, and a fresh VPS ready.

## 1. Server Requirements

Use a DigitalOcean Droplet with Ubuntu 24.04.

Recommended beginner size:

- 1-2 vCPU
- 1-2 GB RAM minimum
- 25 GB SSD minimum
- A domain name pointed to the server IP

You will need:

- VPS public IP address
- SSH access
- Domain name, for example `yourdomain.com`
- Live Paystack keys
- Strong admin password
- PostgreSQL database password

## 2. Update The Server

SSH into your server:

```bash
ssh root@YOUR_SERVER_IP
```

Update Ubuntu:

```bash
sudo apt update
sudo apt upgrade -y
```

Install useful tools:

```bash
sudo apt install -y curl git unzip ufw
```

## 3. Install Node.js LTS

Install Node.js LTS using NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
```

Check versions:

```bash
node -v
npm -v
```

## 4. Install PostgreSQL

Install PostgreSQL:

```bash
sudo apt install -y postgresql postgresql-contrib
```

Start and enable PostgreSQL:

```bash
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo systemctl status postgresql
```

Create database and user:

```bash
sudo -u postgres psql
```

Inside PostgreSQL, run:

```sql
CREATE DATABASE afrikick;
CREATE USER afrikick_user WITH ENCRYPTED PASSWORD 'replace_with_strong_password';
GRANT ALL PRIVILEGES ON DATABASE afrikick TO afrikick_user;
ALTER DATABASE afrikick OWNER TO afrikick_user;
\q
```

Your production `DATABASE_URL` will look like:

```bash
DATABASE_URL="postgresql://afrikick_user:replace_with_strong_password@localhost:5432/afrikick?schema=public"
```

## 5. Install PM2

PM2 keeps the Next.js app running after you close SSH.

```bash
sudo npm install -g pm2
pm2 -v
```

Enable PM2 startup:

```bash
pm2 startup systemd
```

PM2 will print one command. Copy and run that command exactly.

## 6. Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx
```

Allow web traffic:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

## 7. Install Certbot

Certbot will be used later to enable HTTPS.

```bash
sudo apt install -y certbot python3-certbot-nginx
```

## 8. Clone The Project

Choose a production folder:

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
```

Clone your project repository:

```bash
git clone YOUR_REPOSITORY_URL afrikick
cd afrikick
```

Install dependencies:

```bash
npm install
```

## 9. Setup Environment Variables

Create the production `.env` file:

```bash
cp .env.production.example .env
nano .env
```

Fill in real values:

```bash
DATABASE_URL="postgresql://afrikick_user:replace_with_strong_password@localhost:5432/afrikick?schema=public"
ADMIN_EMAIL="your-admin-email@example.com"
ADMIN_PASSWORD="use-a-strong-password"
PAYSTACK_SECRET_KEY="sk_live_xxxxx"
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="pk_live_xxxxx"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

Important:

- Do not use test Paystack keys for live production.
- Do not keep `change-this-password`.
- Do not share `.env` publicly.

## 10. Prepare Upload Folders

Create upload folders:

```bash
mkdir -p public/uploads/payment-receipts
chmod -R 755 public/uploads
```

If Nginx or PM2 cannot write uploads later, fix ownership:

```bash
sudo chown -R $USER:$USER public/uploads
```

## 11. Run Prisma Migration Deploy

Use production migration deploy, not development migration:

```bash
npm run prisma:deploy
```

Generate Prisma client if needed:

```bash
npm run prisma:generate
```

Test database connection:

```bash
npm run db:test
```

## 12. Build The App

```bash
npm run build
```

If this passes, the app is ready to run in production mode.

## 13. Start With PM2

Start the app:

```bash
pm2 start ecosystem.config.js
```

Check status:

```bash
pm2 status
pm2 logs afrikick
```

Save PM2 process list:

```bash
pm2 save
```

Your app should now run internally on:

```bash
http://localhost:3000
```

## 14. Setup Nginx Reverse Proxy

Copy the Nginx config example:

```bash
sudo cp deploy/nginx-afrikick.conf /etc/nginx/sites-available/afrikick
```

Edit it:

```bash
sudo nano /etc/nginx/sites-available/afrikick
```

Replace:

```nginx
yourdomain.com www.yourdomain.com
```

with your real domain.

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/afrikick /etc/nginx/sites-enabled/afrikick
sudo nginx -t
sudo systemctl reload nginx
```

Now visit:

```bash
http://yourdomain.com
```

## 15. Enable HTTPS With Certbot

After DNS points to the VPS and HTTP works:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts.

Test renewal:

```bash
sudo certbot renew --dry-run
```

After HTTPS is active, update `.env`:

```bash
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

Restart PM2:

```bash
pm2 restart afrikick
```

## 16. Use The Production Checklist

Login as admin and open:

```text
https://yourdomain.com/admin/production-checklist
```

Review:

- Database connection
- Environment variables
- Paystack keys
- App URL
- Bank details
- Upload folders
- Security warnings

Fix all missing items before accepting real users.

## 17. PostgreSQL Backup

Create a database backup:

```bash
mkdir -p ~/backups
pg_dump "postgresql://afrikick_user:replace_with_strong_password@localhost:5432/afrikick" > ~/backups/afrikick_$(date +%F_%H-%M).sql
```

Restore a backup:

```bash
psql "postgresql://afrikick_user:replace_with_strong_password@localhost:5432/afrikick" < ~/backups/backup_file.sql
```

## 18. Uploads Folder Backup

Backup uploads:

```bash
mkdir -p ~/backups
tar -czf ~/backups/afrikick_uploads_$(date +%F_%H-%M).tar.gz public/uploads
```

Restore uploads:

```bash
tar -xzf ~/backups/afrikick_uploads_BACKUP_DATE.tar.gz -C /var/www/afrikick
```

## 19. Updating The App Later

From the project folder:

```bash
cd /var/www/afrikick
git pull
npm install
npm run prisma:deploy
npm run build
pm2 restart afrikick
```

Check logs:

```bash
pm2 logs afrikick
```

## 20. Troubleshooting

### Port 3000 Already In Use

Check what is using port 3000:

```bash
sudo lsof -i :3000
```

Stop the old process if needed:

```bash
pm2 status
pm2 stop afrikick
pm2 delete afrikick
```

Then restart:

```bash
pm2 start ecosystem.config.js
pm2 save
```

### Database Connection Failed

Check PostgreSQL status:

```bash
sudo systemctl status postgresql
```

Check `.env`:

```bash
nano .env
```

Test connection:

```bash
npm run db:test
```

Common causes:

- Wrong database password
- Wrong database name
- PostgreSQL is not running
- `DATABASE_URL` has special characters that need URL encoding

### Prisma Migration Error

Validate Prisma schema:

```bash
npx prisma validate
```

Run deploy migration:

```bash
npm run prisma:deploy
```

Check migration status:

```bash
npx prisma migrate status
```

Do not use `prisma migrate dev` on production.

### Nginx 502 Bad Gateway

This usually means Nginx cannot reach the Next.js app.

Check PM2:

```bash
pm2 status
pm2 logs afrikick
```

Check if port 3000 is listening:

```bash
sudo lsof -i :3000
```

Restart app and Nginx:

```bash
pm2 restart afrikick
sudo systemctl reload nginx
```

### Upload Permission Problem

If screenshots or receipts cannot upload:

```bash
mkdir -p public/uploads/payment-receipts
sudo chown -R $USER:$USER public/uploads
chmod -R 755 public/uploads
pm2 restart afrikick
```

Also confirm Nginx upload limit includes:

```nginx
client_max_body_size 25M;
```

## 21. Final Go-Live Checklist

Before real users register:

- Domain points to VPS
- HTTPS works
- `NEXT_PUBLIC_APP_URL` uses HTTPS
- Live Paystack keys are configured
- Admin password is strong
- Bank details are correct
- `npm run build` passes
- `npm run db:test` passes
- Production checklist has no missing items
- PostgreSQL backup command works
- Upload backup command works
