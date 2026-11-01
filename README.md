# 🚚 B2B Van Sales App

A simple web app for wholesale distributors and delivery van drivers to create spot bills, track van stock, and manage shop credit (Khata).

---

## ✨ Features

- **Quick Spot Billing**: Make bills on the road with automatic conversion for **Boxes** and **Dozens**.
- **Shop Khata (Credit Tracking)**: Keep track of partial cash payments, unpaid balances, and total money owed by each shop.
- **58mm Thermal Printing**: Prints clean receipts on small portable Bluetooth printers (like a bus ticket).
- **WhatsApp Bill Sharing**: Share the bill directly to the shopkeeper's WhatsApp as an image with one click.
- **Van Stock Tracking**: Automatically deducts items from the van stock when a bill is made and restores stock if a bill is edited.
- **3 User Roles**:
  - **Admin**: View all sales, driver collections, and total pending credits.
  - **Seller (Van Driver)**: Load van stock, visit shops on their route, and make bills.
  - **Buyer (Shop Owner)**: Check past bills and total pending balance.

---

## 🛠️ Built With

- **Backend**: Java 21, Spring Boot 3, PostgreSQL
- **Frontend**: React, Vite, Tailwind CSS
- **Deployment**: Render (Backend), Vercel (Frontend), Neon (Cloud Database)

---

## 🚀 How to Run Locally

### 1. Backend Setup
1. Go to the `backend` folder:
   ```bash
   cd backend
   ```
2. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
3. Add your database details and JWT secret inside `.env`:
   ```properties
   SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/yourdb
   SPRING_DATASOURCE_USERNAME=postgres
   SPRING_DATASOURCE_PASSWORD=yourpassword
   JWT_SECRET=your_secret_key_here
   ```
4. Start the backend:
   ```bash
   mvn clean spring-boot:run
   ```
   Backend will run at: `http://localhost:8080`

### 2. Frontend Setup
1. Open a new terminal and go to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend:
   ```bash
   npm run dev
   ```
   Frontend will run at: `http://localhost:5173`

---

## 🔒 Security
- All database passwords and keys are read from environment variables.
