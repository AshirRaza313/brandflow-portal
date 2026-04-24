"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Rocket, BookOpen, LayoutDashboard, Package, ShoppingCart, Users,
  Megaphone, BarChart3, Wrench, Globe, Crown, Settings, HelpCircle,
  Lightbulb, ChevronRight, Pencil, Save, X, Plus, Trash2,
  RefreshCw, Shield, Zap, Bot, UserCheck, Timer, Bell, Target,
  TrendingUp, MessageSquare, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

// ============================================================================
// TYPES
// ============================================================================

interface GuideItem { id: string; title: string; content: string; }
interface GuideTabDef { id: string; label: string; icon: string; items: GuideItem[]; roles?: string[]; }
interface GuideData { tabs: GuideTabDef[]; }

// ============================================================================
// ICON HELPER
// ============================================================================

const ICONS: Record<string, any> = {
  Rocket, BookOpen, LayoutDashboard, Package, ShoppingCart, Users,
  Megaphone, BarChart3, Wrench, Globe, Crown, Settings, HelpCircle,
  Lightbulb, ChevronRight, Shield, Zap, Bot, UserCheck, Timer, Bell,
  Target, TrendingUp, MessageSquare, FileText,
};

function TabIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] || BookOpen;
  return <Icon className={className} />;
}

// ============================================================================
// DEFAULT GUIDE CONTENT — 16 TABS, 90+ ITEMS
// ============================================================================

const DEFAULT_GUIDE: GuideData = { tabs: [
  // ── 1. GETTING STARTED ──────────────────────────────────────────────
  { id: "getting-started", label: "Getting Started", icon: "Rocket", items: [
    { id: "gs1", title: "Create Your Account", content: "Sign up with your business email on the login page. Choose a strong password and verify your email address. Once verified, you will be redirected to your new dashboard where you can begin setting up your business profile. Make sure to use a professional email that you check regularly, as all important notifications and order updates will be sent to this address. The signup process takes less than 2 minutes." },
    { id: "gs2", title: "Set Up Your Brand Profile", content: "After logging in, go to Brand Settings from the sidebar under the System group. Here you can upload your brand logo, set your brand name, choose primary and secondary brand colors, and configure your business details including phone number, address, and social media links. This information appears on your invoices, order confirmations, and customer-facing pages, so make sure everything is accurate and professional." },
    { id: "gs3", title: "Understand the Dashboard", content: "The Dashboard is your command center. It shows real-time KPIs including total revenue, active orders, pending tasks, and recent activity. The dashboard is organized into widget cards that you can interact with. Key metrics shown include total sales, number of orders, average order value, top-selling products, and customer growth trends. Use the date filters to view performance over custom time periods." },
    { id: "gs4", title: "Configure Payment Methods", content: "Navigate to Settings and configure how your customers can pay. Supported methods include Cash on Delivery (COD), JazzCash, EasyPaisa, bank transfers, and online payment gateways. For each method, you can set bank account details, JazzCash/EasyPaisa account numbers, and QR codes. You can enable or disable any payment method anytime from your settings panel." },
    { id: "gs5", title: "Add Your First Product", content: "Go to the Products section in the sidebar. Click 'Add Product' to create your first listing. Fill in the product name, description, price, and upload product images. You can also set stock quantity, SKU, weight, and assign it to a category. Products are the foundation of your catalog, so take time to write clear descriptions and upload high-quality images that showcase your products effectively." },
    { id: "gs6", title: "Create Your First Order", content: "Head to the Orders section and click 'New Order' to create a manual order. Select or add a customer, choose products from your catalog, set quantities, apply any discounts or coupons, and select a payment method. Orders go through a clear lifecycle: Pending, Confirmed, Processing, Shipped, and Delivered. You can track every order from placement to delivery." },
    { id: "gs7", title: "Invite Your Team (Brand Owner)", content: "Go to Team Management under the Operations group in the sidebar. Click 'Invite Member' and enter their email address. A unique 6-digit PIN will be generated for each team member. Select a role for them (Admin, Manager, Sales Rep, Designer, Warehouse Staff, etc.). After clicking 'Add Member', use the 'Send Invitation' button to email them the PIN. Your team member can then log in using the 'Team Member Login' option on the login page." },
    { id: "gs8", title: "Team Member PIN Login", content: "If you are a team member, you do not need to create a separate account. On the login page, scroll to the bottom and click 'Are you a team member? Click here to login'. Enter the email address you were invited with, the 6-digit PIN provided by your brand owner, and your assigned team role. Once logged in, you will have immediate access to all features allowed by your role and your brand owner's subscription plan." },
  ]},

  // ── 2. DASHBOARD ───────────────────────────────────────────────────
  { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard", items: [
    { id: "d1", title: "Dashboard Overview", content: "The Dashboard is the first page you see when you log in. It provides a real-time snapshot of your entire business. The top section shows KPI cards including total revenue, total orders, active customers, and pending tasks. Below that, you will find revenue charts, recent orders, top products, and an activity feed that keeps you updated on everything happening in your business." },
    { id: "d2", title: "Understanding Sidebar Navigation", content: "The sidebar on the left is your main navigation tool. It is organized into collapsible groups: Main (Dashboard, Orders, Products, Customers, Tasks, Calendar), Products (Add Product, Categories, Inventory, Pricing, Variants, Catalog), Analytics (Sales, Product, Customer, Revenue, Traffic), Marketing (Campaigns, SEO, Social Media, Email, Ads, Loyalty), Operations (Returns, SLA, Support Tickets, Shipping, Team, Chat), Connections (Integrations, WhatsApp, AI Tools), Guide, and System." },
    { id: "d3", title: "Search and Quick Navigation", content: "Use the search feature in the header to quickly find orders by ID, products by name, and customers by name or phone number. The sidebar groups are collapsible, so you can minimize groups you don't use frequently to keep navigation clean. Click on any group header to expand or collapse it." },
    { id: "d4", title: "Calendar and Tasks", content: "The Calendar tab shows your orders, marketing events, seasonal promotions, and tasks on a visual calendar. You can switch between day, week, and month views. Tasks created in the Tasks section also appear on the calendar with due dates. Click on any calendar item to view details or take action. This gives you a complete visual overview of your business schedule." },
  ]},

  // ── 3. PRODUCTS ────────────────────────────────────────────────────
  { id: "products", label: "Products", icon: "Package", items: [
    { id: "p1", title: "Adding Products", content: "Go to Products section and click 'Add Product'. Fill in the product name, a detailed description, set the selling price, cost price, and upload multiple product images. You can set initial stock quantity, weight for shipping calculations, and assign a category. Products support rich text descriptions for professional formatting. Write descriptions that highlight benefits and key features of each product." },
    { id: "p2", title: "Product Categories", content: "Organize your products into categories like 'Skincare', 'Makeup', 'Hair Care', 'Fragrances', 'Body Care', 'Gift Sets', etc. Go to Categories in the Products group to create, edit, or reorder categories. Each category can have a name, description, and image. Proper categorization helps customers browse your catalog easily and improves overall shopping experience." },
    { id: "p3", title: "Product Variants (Size, Color, Material)", content: "Navigate to Variants under the Products group. For each product, define variant attributes such as size (30ml, 50ml, 100ml), color (Rose, Lavender, Clear), or material (Glass, Plastic, Organic). Each variant combination gets its own price and stock level. The variant matrix shows all combinations at a glance, making it easy to manage complex product catalogs." },
    { id: "p4", title: "Inventory Management", content: "The Inventory tab shows stock levels for all your products and variants. You get low-stock alerts when items fall below a threshold you define. Track stock-in, stock-out, and adjust quantities manually. The inventory page also shows total stock value based on cost prices. Set up automatic reorder points so you never run out of popular items." },
    { id: "p5", title: "Pricing Rules Engine", content: "Go to Pricing Rules in the Products group to set up dynamic pricing strategies. Create rules for percentage markups, bulk discounts (buy 3 get 10% off), flash sales with time limits, tier pricing for wholesale customers, and bundle offers. Each rule can be applied to specific products, categories, or your entire catalog. Pricing rules help you maximize revenue automatically." },
    { id: "p6", title: "Product Catalog", content: "The Catalog tab gives you a beautiful, shareable view of all your products. You can filter by category, sort by price or popularity, and share the catalog link with customers, distributors, or on social media. The catalog works great on mobile devices, making it perfect for sharing on WhatsApp or Instagram. Customers can browse your entire range without needing an account." },
  ]},

  // ── 4. ORDERS ──────────────────────────────────────────────────────
  { id: "orders", label: "Orders", icon: "ShoppingCart", items: [
    { id: "o1", title: "Creating Orders", content: "Go to the Orders section and click 'New Order'. Search for an existing customer or create a new one on the fly. Add products from your catalog, set quantities, and the system automatically calculates totals. You can apply discount codes, add shipping charges, and select a payment method. Orders can be created from customer calls, WhatsApp messages, or walk-in purchases." },
    { id: "o2", title: "Order Statuses and Workflow", content: "Each order goes through a lifecycle: Pending (new order placed), Confirmed (you have verified and accepted), Processing (being packed), Shipped (out for delivery with tracking), and Delivered (successfully delivered). You can also mark orders as Cancelled or Returned. Each status change can trigger automatic notifications to customers." },
    { id: "o3", title: "SLA Engine", content: "The SLA (Service Level Agreement) Engine under Operations automatically tracks how long each order takes to process. You define targets like 'confirm within 2 hours', 'ship within 24 hours'. Each order shows a countdown timer that turns yellow when close to breaching and red when breached. This helps you maintain fast delivery times and happy customers." },
    { id: "o4", title: "Returns and Refunds", content: "Go to Returns under Operations to manage product returns. When a customer requests a return, create a return entry linked to the original order. Track the return status: Requested, Approved, Received, Refunded. Process full or partial refunds based on your return policy. Maintain a clear record of all returns for accounting and quality analysis." },
    { id: "o5", title: "Bulk Order Actions", content: "Select multiple orders from the list using checkboxes, then choose actions like 'Mark as Shipped', 'Print Invoices', 'Export to CSV', or 'Send Notifications'. This saves enormous time when processing dozens of orders during sale events or holiday seasons. Bulk actions are available for all order statuses and can be combined with filters." },
  ]},

  // ── 5. CUSTOMERS ───────────────────────────────────────────────────
  { id: "customers", label: "Customers", icon: "Users", items: [
    { id: "c1", title: "Customer Management", content: "The Customers section is your CRM hub. View all customer profiles with their contact information, order history, total spending, and loyalty tier. You can search customers by name, phone, or email. Each customer profile shows complete order timeline and average order value. This data helps you understand your customer base and make informed business decisions." },
    { id: "c2", title: "Loyalty Program", content: "The built-in loyalty program has three tiers: Bronze (0-499 points), Silver (500-1499 points), and Gold (1500+ points). Customers earn points on every purchase. Higher tiers unlock exclusive benefits like early access, special discounts, and bonus points on birthdays. The loyalty program automatically tracks and updates customer tiers, encouraging repeat purchases." },
    { id: "c3", title: "Customer Segmentation", content: "Segment your customers based on purchase behavior, spending levels, location, or custom tags. Create segments like 'High-Value Customers', 'Inactive Customers', 'Repeat Buyers', or 'Wholesale Clients'. Use segments to run targeted marketing campaigns via email, WhatsApp, or SMS. Segmentation helps you deliver the right message to the right customer at the right time." },
    { id: "c4", title: "Reviews and Ratings", content: "Go to Reviews under Operations to see what customers are saying about your products. Customers can leave star ratings and written reviews. You can respond to reviews, feature positive ones, and flag inappropriate content. Review analytics show your average rating and sentiment trends. Positive reviews build social proof and drive new customer trust." },
  ]},

  // ── 6. MARKETING ───────────────────────────────────────────────────
  { id: "marketing", label: "Marketing", icon: "Megaphone", items: [
    { id: "m1", title: "Marketing Campaigns", content: "Go to Campaigns under Marketing to create and manage promotional campaigns. You can create campaigns for WhatsApp, Email, Social Media, or SMS. Each campaign has a target audience (use customer segments), content (text, images, links), and scheduling options. Track performance with open rate, click rate, and conversion metrics. Schedule campaigns in advance for hands-free marketing." },
    { id: "m2", title: "Seasonal Events and Sales", content: "The Events and Seasonal Sales feature has 50+ pre-built Pakistani and international events like Eid ul Fitr, Eid ul Adha, Independence Day, Black Friday, 12.12 Sale, Women's Day, and more. Select an event, set a discount, choose products or categories, and set start/end dates. Themed banners appear automatically during active events, creating urgency and driving sales." },
    { id: "m3", title: "SEO and Social Media", content: "The SEO tab under Marketing helps optimize your product pages for search engines. Add meta titles, descriptions, and keywords for each product. The Social Media tab lets you plan and schedule posts, track engagement metrics, and manage your brand's presence across platforms. Strong SEO and social media presence drives organic traffic and reduces customer acquisition costs." },
    { id: "m4", title: "Coupons and Discounts", content: "Create coupon codes that customers can apply at checkout. Set discount types (percentage or flat amount), minimum order requirements, usage limits, and expiry dates. Create public coupons (anyone can use) or private coupons (sent to specific customers). Track usage and total discount value. Coupons are powerful tools for customer retention and cart recovery." },
    { id: "m5", title: "Referral Program", content: "Set up a referral program to turn existing customers into brand ambassadors. Each customer gets a unique referral link to share with friends. When a referred friend makes their first purchase, both get rewards (discount points or coupon codes). Track referral performance and identify your top referrers. Word-of-mouth marketing through referrals is the most cost-effective growth strategy." },
    { id: "m6", title: "Broadcasts and Brand Ambassadors", content: "Use Broadcasts to send mass messages to your entire customer base or specific segments via WhatsApp or Email. The Brand Ambassadors feature lets you manage influencers and affiliates who promote your products. Track their performance and manage commission structures. Broadcasts are essential for announcing new products, flash sales, and important updates." },
  ]},

  // ── 7. ANALYTICS ───────────────────────────────────────────────────
  { id: "analytics", label: "Analytics", icon: "BarChart3", items: [
    { id: "a1", title: "Sales Analytics", content: "The Sales Analytics tab shows your revenue trends over time with interactive charts. View daily, weekly, monthly, or yearly revenue. See your best-selling products, top revenue categories, and average order values. Compare performance across time periods to identify growth trends. Data-driven decisions based on analytics lead to faster business growth." },
    { id: "a2", title: "Product Analytics", content: "Understand how each product is performing. See views, orders, revenue, and conversion rates per product. Identify slow-moving products that need promotion and best-sellers that need restocking. Product analytics also show variant performance and category breakdowns. Use this data to optimize your product mix and focus on high-margin items." },
    { id: "a3", title: "Customer Analytics", content: "Track customer acquisition, retention, and lifetime value. See how many new customers you are getting each month, which channels they come from, and how much they spend over time. Also see geographic distribution and cohort analysis. Understanding your customers deeply helps you tailor products and marketing to their needs." },
    { id: "a4", title: "Revenue and Profit Analytics", content: "Go beyond top-line revenue. The Revenue Analytics tab shows gross profit margins, cost breakdowns, and net profit trends. See which payment methods are most popular, which categories drive the most profit, and how seasonal trends affect your bottom line. Tracking profit margins ensures your business remains financially healthy and sustainable." },
    { id: "a5", title: "Traffic and Conversion Analytics", content: "If you have a website or storefront connected, the Traffic Analytics tab shows visitor counts, page views, bounce rates, and conversion funnels. Understand where your traffic comes from and which pages convert best. Use this data to optimize user experience and increase conversions. Higher conversion rates mean more revenue from the same traffic." },
  ]},

  // ── 8. TEAM ────────────────────────────────────────────────────────
  { id: "team", label: "Team", icon: "Users", items: [
    { id: "t1", title: "Team Roles and Permissions", content: "The platform has 16 roles: Platform Owner (full access), Platform Admin (all except platform settings), Brand Owner (full brand access), Brand Admin (full brand except billing), Operations Manager (orders, inventory, shipping), Sales Manager (sales, customers), Marketing Manager (marketing, SEO, social), Warehouse Manager (warehouse, packaging), Accountant (financial reports), Team Lead (team, tasks), Support Agent (tickets, WhatsApp), Content Creator (marketing content), Sales Rep (orders, customers), Inventory Clerk (inventory only), Viewer (read-only), Custom (configurable)." },
    { id: "t2", title: "Inviting Team Members with PIN", content: "Go to Team Management under Operations. Click 'Invite Member', enter their email. A unique 6-digit PIN is generated. Select a role and click 'Add Member'. Click 'Send Invitation' to email them. They log in via 'Team Member Login' on the login page with email + PIN + role. Plan limits: Starter (3 members), Growth (15 members), Enterprise (unlimited)." },
    { id: "t3", title: "Team Member Plan Access", content: "IMPORTANT: Team members do NOT need their own subscription. The subscription is per-organization. When the brand owner buys Growth plan, ALL team members get Growth features. When upgraded to Enterprise, ALL team members get Enterprise features. The only limit is team member count per plan. Each team member's access is also filtered by their individual role permissions." },
    { id: "t4", title: "Managing Team Members", content: "In Team Management, see a list of all team members with their roles, status (active or pending), and join date. Change a member's role by clicking the role dropdown. Remove members as needed. Each member can update their own profile including name, picture, and notification preferences. Keep your team organized with clear roles and responsibilities." },
    { id: "t5", title: "Team Chat", content: "The Team Chat feature under Operations provides real-time messaging for your team. Create channels for different topics (General, Orders, Marketing, Design). Send text messages, attach files and images (up to 20MB), record and send voice notes, and share product links. Each brand's team chat is completely isolated. Available on Growth plan and above." },
  ]},

  // ── 9. OPERATIONS ──────────────────────────────────────────────────
  { id: "operations", label: "Operations", icon: "Wrench", items: [
    { id: "op1", title: "Shipping and Delivery", content: "Go to Shipping under Operations to configure delivery zones, shipping rates, and courier partners. Set up rates based on weight, distance, or flat rates per city. Track all shipments with courier integration and provide customers with tracking numbers. Set free shipping thresholds to encourage larger orders. Efficient shipping management is key to customer satisfaction." },
    { id: "op2", title: "Warehouse and Suppliers", content: "The Warehouse tab lets you manage physical storage locations. Track which products are stored where, manage stock transfers between locations, and monitor warehouse capacity. The Suppliers tab helps maintain a database of your raw material and product suppliers with contact details and order history. Strong supplier relationships ensure reliable product availability." },
    { id: "op3", title: "Packaging Management", content: "Go to Packaging under Operations to define your packaging options (boxes, pouches, gift wraps) with sizes and costs. Assign default packaging to products or categories. Track packaging inventory so you never run out during peak seasons. Create special packaging rules for events like Eid gift wrapping." },
    { id: "op4", title: "Support Tickets", content: "The Support Tickets system helps manage customer inquiries efficiently. Assign tickets to team members, set priority levels (Low, Medium, High, Urgent), track response times, and maintain resolution history. Use ticket categories to organize by type: Order Issue, Product Question, Return Request, Payment Problem, or General Inquiry." },
    { id: "op5", title: "Support Chat (Client to Admin)", content: "The Support Chat feature provides a direct, private messaging channel between each client and the platform admin. Clients can send text messages, voice notes, file attachments, and even initiate voice or video calls. Each client's conversation is completely isolated and private. Use this for quick problem resolution and real-time customer support." },
  ]},

  // ── 10. CONNECTIONS ────────────────────────────────────────────────
  { id: "connections", label: "Connections", icon: "Globe", items: [
    { id: "co1", title: "Third-Party Integrations", content: "Go to Connections in the sidebar to connect external services. The platform integrates with WooCommerce, Daraz, Shopify, Stripe, JazzCash, EasyPaisa, and courier services (TCS, Leopards, M&P). Each integration has a setup wizard. Once connected, data flows automatically between the platform and the external service." },
    { id: "co2", title: "WhatsApp Business", content: "The WhatsApp Business integration under Connections lets you connect your WhatsApp Business API account. Configure message templates for order confirmations, shipping updates, delivery notifications, and promotional messages. Send product catalogs directly via WhatsApp. Essential for Pakistani businesses where WhatsApp is the primary communication channel." },
    { id: "co3", title: "AI Tools", content: "The AI Tools section under Connections provides AI-powered features to boost productivity. Use AI to generate product descriptions, marketing copy, email subject lines, and social media captions. The AI can also analyze customer feedback, suggest pricing strategies, and help forecast demand. AI tools save hours of manual work and improve content quality." },
  ]},

  // ── 11. PLANS & BILLING ────────────────────────────────────────────
  { id: "plans", label: "Plans & Billing", icon: "Crown", items: [
    { id: "pl1", title: "Subscription Plans Overview", content: "Three tiers are available: Starter (free, up to 50 products, 100 orders/month, 3 team members), Growth (Rs 4,999/month, unlimited products/orders, 15 team members, advanced features), and Enterprise (Rs 14,999/month, everything unlimited + AI tools + custom integrations + dedicated support). Choose the plan that fits your current business size and upgrade as you grow." },
    { id: "pl2", title: "Plan Features Comparison", content: "Starter: Dashboard, basic products, basic orders, basic analytics, 3 team members. Growth adds: Marketing campaigns, seasonal events, SEO, social media, email marketing, loyalty program, SLA engine, team chat, advanced analytics, AI tools, 15 team members. Enterprise adds: Custom integrations, support tickets, warehouse management, audit log, unlimited team, dedicated account manager." },
    { id: "pl3", title: "How Team Members Get Plan Features", content: "Your subscription plan applies to your ENTIRE organization. When you upgrade from Starter to Growth, every team member immediately gains access to Growth-level features like Marketing Campaigns, Social Media, and Advanced Analytics. No separate plans needed for team members. Only limit is member count: Starter (3), Growth (15), Enterprise (unlimited)." },
    { id: "pl4", title: "Upgrading Your Plan", content: "Go to Subscriptions under System group. Select your desired plan and follow payment instructions. Accepted payment methods include JazzCash, EasyPaisa, bank transfer, and online payment. Upload proof of payment. Admin reviews and approves. Plan activates immediately upon approval. All your data is preserved during plan changes." },
    { id: "pl5", title: "Trial Period", content: "New accounts start with a free 14-day trial on Growth plan. During the trial, you have full access to Growth features. When the trial ends, your account automatically downgrades to Starter. You can upgrade anytime during or after the trial. A countdown timer shows remaining trial days on your dashboard." },
    { id: "pl6", title: "Understanding Feature Badges", content: "Some sidebar features show plan badges like 'Growth Plan' or 'Enterprise Plan'. This means the feature requires a higher tier. If a feature appears disabled, you or your brand owner need to upgrade the subscription. The platform admin can also unlock specific features regardless of plan for special cases." },
  ]},

  // ── 12. SETTINGS ───────────────────────────────────────────────────
  { id: "settings", label: "Settings", icon: "Settings", items: [
    { id: "s1", title: "Brand Settings", content: "Go to Brand Settings under the System group. Upload your logo (appears on invoices, emails, portal header), set brand colors, write your business description, and configure contact details including phone numbers, email addresses, and social media links. Your brand settings define how your business appears to customers across all touchpoints." },
    { id: "s2", title: "Theme and Appearance", content: "Three themes are available: Light (clean white), Dark (dark mode), and Premium Dark (luxurious dark with gold accents). Switch themes from Brand Settings or user profile menu. Theme preference is saved per user, so each team member can use their preferred theme. Choose the theme that feels most comfortable for your daily workflow." },
    { id: "s3", title: "User Management (Admin)", content: "The User Management tab under System shows all registered users, their roles, organizations, and activity status. Platform admins can manage all accounts, reset passwords, change roles, and deactivate accounts. This is separate from Team Management which handles members within your specific organization." },
    { id: "s4", title: "Platform Settings (Platform Owner Only)", content: "Platform Settings contains: Personal Details (name, email, position, bio, profile picture), Company Info (company name, email, phone, website, address), Contact and Support (support hours, social media), Plans and Pricing (manage plan prices), Payment Methods (configure accepted payments), Branding (platform-wide colors, logos, white-label settings)." },
  ]},

  // ── 13. ADVANCED FEATURES ─────────────────────────────────────────
  { id: "advanced", label: "Advanced Features", icon: "Zap", items: [
    { id: "af1", title: "Automated Order Processing", content: "The platform can automate repetitive order tasks. Set up automatic order confirmation when payment is received, automatic status updates when shipped via courier integration, and automatic delivery confirmation. These automations reduce manual work and ensure orders move through the pipeline faster. Configure automation rules in the Operations section based on your business workflow." },
    { id: "af2", title: "Smart Inventory Alerts", content: "Never run out of stock unexpectedly. Configure low-stock thresholds for each product and receive automatic alerts when stock falls below the limit. The system can also predict stock-outs based on sales velocity and recommend reorder quantities. Set up automatic purchase order suggestions that calculate how much to order based on lead time and average daily sales." },
    { id: "af3", title: "Customer Communication Automation", content: "Automate customer communication at every stage. Set up automatic WhatsApp or email messages for: order confirmation, payment received, order shipped with tracking, delivery completed, review request after delivery, and win-back messages for inactive customers. Use message templates for consistent branding. Automated communication improves customer experience while saving hours of manual work." },
    { id: "af4", title: "Revenue Forecasting", content: "Use the Revenue Analytics section to forecast future revenue based on historical trends. The system analyzes your sales patterns, seasonal variations, and growth trends to project next month's expected revenue. Use these forecasts for inventory planning, hiring decisions, and budget allocation. Accurate forecasting helps you make proactive business decisions instead of reactive ones." },
    { id: "af5", title: "Batch Operations for Efficiency", content: "Process multiple items at once using batch operations. In Orders: mark multiple as shipped, print multiple invoices, export filtered orders. In Products: bulk update prices, bulk change categories, bulk adjust stock levels. In Customers: export segments, apply tags in bulk. Batch operations are available across most sections and can be combined with filters for targeted actions." },
    { id: "af6", title: "Data Export and Reporting", content: "Most pages have export functionality. Go to any section (Orders, Products, Customers, Analytics), apply your filters, and click Export to get CSV or Excel files. Export order reports for accounting, customer lists for marketing, product data for catalog updates, and inventory reports for stock planning. Schedule regular exports to keep your accounting and planning data always up to date." },
    { id: "af7", title: "Multi-Currency Support", content: "Configure multiple currencies in your settings if you sell internationally or deal with suppliers in different currencies. Set base currency and conversion rates. The system can display prices in multiple currencies and track revenue in your base currency. Useful for businesses that import products or serve customers in different countries." },
    { id: "af8", title: "Automated Backup and Data Protection", content: "Your data is automatically backed up on secure servers. Use the export feature for additional local backups of products, customers, and orders. Store exports in Google Drive or Dropbox for extra safety. Regular backups protect against accidental deletion and system issues. It is recommended to export critical data weekly as a best practice for data security." },
  ]},

  // ── 14. SOLO OWNER FEATURES ───────────────────────────────────────
  { id: "solo-owner", label: "Solo Owner Guide", icon: "UserCheck", items: [
    { id: "so1", title: "Running Your Business Alone", content: "You don't need a team to run a successful business on this platform. Every feature is designed to work perfectly for solo brand owners. The dashboard gives you a complete overview of your business at a glance. Orders, products, customers, analytics, and marketing are all accessible from a single interface. Manage everything yourself at your own pace without depending on anyone else." },
    { id: "so2", title: "Quick Order Creation from WhatsApp", content: "When customers message you on WhatsApp with orders, quickly create them in the portal. Go to Orders, click New Order, enter the customer's name and phone, add products, and set the payment method. The entire process takes under 60 seconds. Keep the Orders page open on your phone or second screen while chatting with customers for fastest order entry." },
    { id: "so3", title: "Automated Customer Follow-ups", content: "As a solo owner, you can't manually follow up with every customer. Set up automated WhatsApp or email messages: order confirmation when you create an order, shipping update when you dispatch, delivery thank you message, and a review request 2 days after delivery. These automated messages keep customers informed and build trust without requiring your time." },
    { id: "so4", title: "Smart Time Management Tips", content: "Use the Tasks feature to create a daily to-do list. Set tasks like 'Process pending orders', 'Update inventory', 'Respond to customer messages'. The Calendar view shows your tasks alongside orders and events. Block specific times for order processing, product photography, and customer communication. Consistent daily routines lead to sustainable business growth." },
    { id: "so5", title: "Financial Tracking Without an Accountant", content: "Use Revenue Analytics to track your daily, weekly, and monthly income. The system calculates gross profit based on your cost prices and selling prices. Export order data as CSV and import it directly into Excel or Google Sheets for expense tracking. Monitor your profit margins per product and per category to identify which items are most profitable for your business." },
    { id: "so6", title: "Growing from Solo to Team", content: "When your business grows beyond what you can handle alone, adding team members is seamless. Start with the free Starter plan that supports 3 team members. Invite a friend or family member to help with orders. Assign them a specific role like Sales Rep or Inventory Clerk. They get their own login and can only see features relevant to their role. Scale your team as your business grows." },
  ]},

  // ── 15. FAQ ────────────────────────────────────────────────────────
  { id: "faq", label: "FAQ", icon: "HelpCircle", items: [
    { id: "f1", title: "How do I add product variants (size, color, material)?", content: "Navigate to Products group and click Variants. Select the product, define variant attributes (size, color, material). The system generates all combinations. Set individual prices and stock for each. The variant matrix shows all combinations at a glance. This is especially useful for products that come in multiple sizes, colors, or packaging options." },
    { id: "f2", title: "What payment methods are supported?", content: "Cash on Delivery (COD), JazzCash, EasyPaisa, Stripe (international cards), and bank transfers are all supported. Enable or disable any method from Settings. Configure account numbers for JazzCash/EasyPaisa so they appear on invoices. You can add custom payment methods and bank details as needed." },
    { id: "f3", title: "How does the loyalty program work?", content: "Customers earn points on every purchase based on order value. Points are credited when orders are marked as Delivered. Tiers: Bronze (0-499 points), Silver (500-1499), Gold (1500+). Higher tiers unlock exclusive discounts, early access, and birthday bonus points. The program runs automatically once enabled." },
    { id: "f4", title: "Can I sync products with Daraz and Shopify?", content: "Yes! Go to Connections and click Integrations. Connect your accounts using the setup wizard. Enable product sync for automatic syncing of products, inventory, and orders. Set sync direction (one-way or both) and configure sync frequency. Webhooks provide real-time updates when changes occur on either platform." },
    { id: "f5", title: "How do team members log in?", content: "Team members don't create their own accounts. On the login page, scroll to the bottom and click 'Are you a team member? Click here to login'. Enter the email, 6-digit PIN (provided by brand owner), and team role. Brand owner gets notified when team member joins. This system is simple, secure, and doesn't require team members to manage separate passwords." },
    { id: "f6", title: "Do team members need their own subscription?", content: "No! Team members automatically inherit the brand owner's plan features. The subscription is per-organization, not per-user. If the brand owner has Growth plan, all team members get Growth features. If Enterprise, they get Enterprise features. Only limit: Starter (3 members), Growth (15), Enterprise (unlimited)." },
    { id: "f7", title: "How do I upgrade my plan?", content: "Go to Subscriptions under System. Select your desired plan and follow payment instructions (JazzCash, EasyPaisa, bank transfer). Upload proof of payment. Admin reviews and approves. Plan upgrades immediately and all team members get new features. There is no data loss during upgrades." },
    { id: "f8", title: "Is there a mobile app?", content: "The portal is a Progressive Web App (PWA). On Android, open in Chrome and tap 'Add to Home Screen'. On iPhone, open in Safari and tap Share then 'Add to Home Screen'. Works offline for basic viewing and sends push notifications. The mobile experience is fully responsive and optimized for phone screens." },
    { id: "f9", title: "How do I contact support?", content: "Use Support Chat in Operations for real-time messaging. Support Chat supports text, voice notes, files, and voice/video calls. You can also email the support email shown in Support Chat. Response time is typically within 1 hour during business hours (Mon-Sat, 9AM-6PM PKT)." },
    { id: "f10", title: "How do I export my data?", content: "Most pages have an export button. Go to any section (Orders, Products, Customers, etc.), apply filters, and click Export. Export to CSV or Excel format. Useful for accounting, reporting, or data migration. Schedule regular automated exports for up-to-date records. Always keep a backup of your important business data." },
  ]},

  // ── 16. BEST PRACTICES ─────────────────────────────────────────────
  { id: "tips", label: "Best Practices", icon: "Lightbulb", items: [
    { id: "tp1", title: "Set SMART Goals for Your Business", content: "Define Specific, Measurable, Achievable, Relevant, and Time-bound goals. Example: 'Increase monthly revenue by 20% in the next quarter'. Use Analytics to track weekly progress. Track KPIs like average order value, customer acquisition cost, and repeat purchase rate. Review your goals monthly and adjust based on actual performance data." },
    { id: "tp2", title: "Keep Product Images Professional", content: "Use good lighting, clean background, and multiple angles. For cosmetics, include swatches on skin tones. Use consistent image sizes across all products. Compress images for fast loading. Products with 5+ images sell significantly better than those with just one. Invest time in product photography as it directly impacts sales." },
    { id: "tp3", title: "Respond to Customers Within 1 Hour", content: "Fast response time builds trust and increases conversion rates. Use Support Chat for instant communication, WhatsApp for after-hours, and email templates for common questions. Customers who receive a quick response are 4x more likely to complete a purchase. Set up auto-replies for when you are unavailable." },
    { id: "tp4", title: "Leverage Seasonal Sales for Revenue Spikes", content: "Pakistani events (Eid, Independence Day, Black Friday, Women's Day) are massive revenue opportunities. Plan promotions 2-3 weeks ahead. Create event-specific bundles, limited-time discounts, and build social media excitement. Use Marketing Events to schedule everything in advance so you can focus on order fulfillment during the sale." },
    { id: "tp5", title: "Monitor Profit Margins, Not Just Revenue", content: "Maintain healthy margins (40-60% for cosmetics). Track cost prices alongside selling prices. Factor in shipping, packaging, and platform fees. Use Revenue Analytics for gross and net margins. Avoid over-discounting during sales as it can erode margins. Focus on profitability, not just top-line revenue." },
    { id: "tp6", title: "Back Up Your Data Regularly", content: "Use the export feature to download weekly backups of products, customers, and orders. Store in Google Drive or Dropbox. This protects against accidental deletion and system issues. It also helps with accounting and tax filing. Set a recurring reminder to export data every Friday afternoon as part of your weekly business routine." },
    { id: "tp7", title: "Build Customer Relationships", content: "Go beyond transactions. Use the loyalty program to reward repeat customers. Send personalized messages on birthdays and anniversaries. Ask for reviews after delivery and respond to all feedback. A customer who feels valued will return and recommend your brand to others. Customer retention is 5x cheaper than customer acquisition." },
    { id: "tp8", title: "Use Analytics to Make Decisions", content: "Don't guess what works - let the data guide you. Check your Sales Analytics weekly to see which products and categories are performing best. Use Customer Analytics to understand buying patterns. Review Revenue Analytics monthly to track profit margins. Data-driven decisions consistently outperform gut-feeling decisions in business growth." },
  ]},
]};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function UserGuidePage() {
  const [guideData, setGuideData] = useState<GuideData>(DEFAULT_GUIDE);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTabId, setEditTabId] = useState("");
  const [editItemId, setEditItemId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addTabId, setAddTabId] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addContent, setAddContent] = useState("");

  // Detect theme from store (non-blocking)
  const [appTheme, setAppTheme] = useState("premium-dark");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load theme & role from localStorage
  const [initDone, setInitDone] = useState(false);

  if (!initDone && typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("brandonix-appTheme");
      if (stored) setAppTheme(stored);
      const userData = localStorage.getItem("brandonix-user");
      if (userData) {
        const u = JSON.parse(userData);
        setUserRole(u.role || null);
        setIsAdmin(["platform_owner", "platform_admin", "owner"].includes(u.role));
      }
    } catch { /* ignore */ }
    setInitDone(true);
  }

  // Load custom guide content from API (non-blocking, background)
  // SECURITY: Only use DB data if it has MORE content than DEFAULT_GUIDE
  // This prevents empty/corrupt DB data from overwriting good defaults
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch("/api/admin/guide");
        if (!r.ok) return;
        const data = await r.json();
        if (cancelled) return;
        if (data?.content && Array.isArray(data.content.tabs) && data.content.tabs.length > 0) {
          // CRITICAL: Validate that DB content is actually good (has items)
          const dbTotalItems = data.content.tabs.reduce((s: number, t: any) => s + (t.items?.length || 0), 0);
          const defaultTotalItems = DEFAULT_GUIDE.tabs.reduce((s, t) => s + t.items.length, 0);
          // Only use DB content if it has MORE items than defaults (admin must have added content)
          if (dbTotalItems >= defaultTotalItems) {
            setGuideData(data.content);
          }
        }
      } catch { /* keep defaults */ }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Save guide
  const saveGuide = async () => {
    setSaving(true);
    try {
      const userData = localStorage.getItem("brandonix-user");
      const userId = userData ? JSON.parse(userData)?.id : null;
      const r = await fetch("/api/admin/guide", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, content: guideData }),
      });
      if (r.ok) { toast.success("Guide saved"); setEditMode(false); }
      else toast.error("Failed to save");
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  };

  const resetGuide = () => {
    setGuideData(DEFAULT_GUIDE);
    toast.success("Guide reset to defaults. Click Save to apply.");
  };

  const openEdit = (tabId: string, itemId: string) => {
    const tab = guideData.tabs.find(t => t.id === tabId);
    const item = tab?.items.find(i => i.id === itemId);
    if (!item) return;
    setEditTabId(tabId); setEditItemId(itemId);
    setEditTitle(item.title); setEditContent(item.content);
    setEditOpen(true);
  };

  const saveEdit = () => {
    setGuideData(prev => ({
      ...prev,
      tabs: prev.tabs.map(t =>
        t.id === editTabId
          ? { ...t, items: t.items.map(i => i.id === editItemId ? { ...i, title: editTitle, content: editContent } : i) }
          : t
      ),
    }));
    setEditOpen(false);
    toast.success("Item updated. Click Save to persist.");
  };

  const deleteItem = (tabId: string, itemId: string) => {
    if (!confirm("Delete this guide item?")) return;
    setGuideData(prev => ({
      ...prev,
      tabs: prev.tabs.map(t =>
        t.id === tabId ? { ...t, items: t.items.filter(i => i.id !== itemId) } : t
      ),
    }));
    toast.success("Item removed. Click Save to persist.");
  };

  const openAdd = (tabId: string) => {
    setAddTabId(tabId); setAddTitle(""); setAddContent(""); setAddOpen(true);
  };

  const addItem = () => {
    if (!addTitle.trim() || !addContent.trim()) { toast.error("Title and content required"); return; }
    setGuideData(prev => ({
      ...prev,
      tabs: prev.tabs.map(t =>
        t.id === addTabId
          ? { ...t, items: [...t.items, { id: `custom-${Date.now()}`, title: addTitle.trim(), content: addContent.trim() }] }
          : t
      ),
    }));
    setAddOpen(false);
    toast.success("Item added. Click Save to persist.");
  };

  // Theme CSS classes
  const isDark = appTheme === "dark" || appTheme === "premium-dark";
  const isGold = appTheme === "premium-dark";
  const txt1 = isDark ? "text-slate-100" : "text-slate-800";
  const txt2 = isDark ? "text-slate-400" : "text-slate-500";
  const txt3 = isDark ? "text-slate-300" : "text-slate-600";
  const cardBg = isGold ? "bg-[#111118] border-white/8" : isDark ? "bg-slate-800/50 border-slate-700/50" : "bg-white border-slate-200";
  const hoverBg = isDark ? "hover:bg-white/5" : "hover:bg-slate-50";
  const tabsBg = isGold ? "bg-[#0f0f17]" : isDark ? "bg-slate-800" : "bg-slate-100";
  const activeTab = isGold
    ? "data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
    : isDark
    ? "data-[state=active]:bg-slate-700 data-[state=active]:text-white"
    : "data-[state=active]:bg-emerald-600 data-[state=active]:text-white";
  const badgeCls = isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500";
  const accent = isGold ? "text-amber-400" : isDark ? "text-emerald-400" : "text-emerald-600";
  const accentBg = isGold ? "bg-amber-500/15" : isDark ? "bg-emerald-500/15" : "bg-emerald-100";
  const accentBtn = isGold ? "bg-amber-500 hover:bg-amber-600 text-black" : "bg-emerald-600 hover:bg-emerald-700 text-white";
  const accentOut = isGold ? "border-amber-500/25 text-amber-400 hover:bg-amber-500/10" : "border-emerald-300 text-emerald-600 hover:bg-emerald-50";

  // Role-based tab filtering
  const visibleTabs = guideData.tabs.filter(tab => {
    if (!tab.roles || tab.roles.length === 0) return true;
    return userRole ? tab.roles.includes(userRole) : true;
  });
  const firstTab = visibleTabs.length > 0 ? visibleTabs[0].id : guideData.tabs[0]?.id || "getting-started";
  const totalItems = guideData.tabs.reduce((s, t) => s + t.items.length, 0);

  // ════════════════════════════════════════════════════════════════════
  // RENDER — Fully responsive for mobile and desktop
  // ════════════════════════════════════════════════════════════════════

  return (
    <div style={{ minHeight: 200 }} className="space-y-4 sm:space-y-5">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className={cn("text-lg sm:text-2xl font-bold flex items-center gap-2", txt1)}>
            <BookOpen className={cn("h-5 w-5 sm:h-6 sm:w-6 shrink-0", accent)} />
            <span className="truncate">User Guide</span>
          </h1>
          <p className={cn("text-xs sm:text-sm mt-1", txt2)}>
            Complete guide to using every feature of the portal
          </p>
          <p className={cn("text-[10px] sm:text-xs mt-0.5", txt2)}>
            {guideData.tabs.length} sections, {totalItems} guide items
            {userRole && <span> | Role: <b>{userRole}</b></span>}
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {editMode ? (
              <>
                <Button size="sm" variant="outline" className={cn("gap-1 text-xs", isDark ? "border-white/10 text-slate-300" : "")} onClick={resetGuide}>
                  <RefreshCw className="h-3 w-3" /> <span className="hidden sm:inline">Reset</span>
                </Button>
                <Button size="sm" variant="outline" className={cn("gap-1 text-xs", isDark ? "border-red-500/25 text-red-400 hover:bg-red-500/10" : "border-red-300 text-red-600 hover:bg-red-50")} onClick={() => setEditMode(false)}>
                  <X className="h-3 w-3" /> <span className="hidden sm:inline">Cancel</span>
                </Button>
                <Button size="sm" className={cn("gap-1 text-xs", accentBtn)} onClick={saveGuide} disabled={saving}>
                  {saving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" className={cn("gap-1 text-xs", accentOut)} onClick={() => setEditMode(true)}>
                <Pencil className="h-3 w-3" /> Edit Guide
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── TABS & CONTENT ── */}
      <Tabs defaultValue={firstTab} className="space-y-3 sm:space-y-4">
        {/* Scrollable tab bar — TabsList required for Radix RovingFocusGroup */}
        <TabsList className={cn(
          "rounded-xl p-1 h-auto flex gap-1 overflow-x-auto scrollbar-none pb-1 w-full justify-start",
          tabsBg,
          "bg-transparent border-0 shadow-none"
        )}>
          {guideData.tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-sm whitespace-nowrap rounded-lg transition-all shrink-0",
                activeTab,
                isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <TabIcon name={tab.icon} className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
              {tab.label}
              <Badge variant="outline" className={cn("ml-0.5 sm:ml-1 text-[8px] sm:text-[9px] px-1 py-0 h-4 hidden xs:inline-flex", badgeCls)}>{tab.items.length}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab content */}
        {guideData.tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-2 sm:mt-4">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <Card className={cn("rounded-xl sm:rounded-2xl overflow-hidden", cardBg)}>
                <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className={cn("p-1.5 sm:p-2 rounded-lg shrink-0", accentBg)}>
                        <TabIcon name={tab.icon} className={cn("h-4 w-4 sm:h-5 sm:w-5", accent)} />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className={cn("text-sm sm:text-base font-semibold truncate", txt1)}>{tab.label}</CardTitle>
                        <CardDescription className={cn("text-[10px] sm:text-xs", txt2)}>{tab.items.length} guide items</CardDescription>
                      </div>
                    </div>
                    {editMode && isAdmin && (
                      <Button size="sm" variant="outline" className={cn("gap-1 text-[10px] sm:text-xs shrink-0", accentOut)} onClick={() => openAdd(tab.id)}>
                        <Plus className="h-3 w-3" /> Add
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {tab.items.length === 0 ? (
                    <div className={cn("text-center py-10 sm:py-12 px-4", txt2)}>
                      <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 opacity-20" />
                      <p className="text-xs sm:text-sm font-medium">No items in this section</p>
                      <p className={cn("text-[10px] sm:text-xs mt-1", txt2)}>{editMode ? "Click Add to create items" : "No guide content available"}</p>
                    </div>
                  ) : (
                    <Accordion type="multiple" defaultValue={tab.items.slice(0, 2).map(i => i.id)} className="w-full">
                      {tab.items.map((item) => (
                        <AccordionItem key={item.id} value={item.id} className="px-2 sm:px-4 border-b border-white/5 last:border-b-0">
                          <AccordionTrigger className={cn("hover:no-underline rounded-lg py-2.5 sm:py-4 px-1 sm:px-2 text-left", hoverBg)}>
                            <div className="flex items-center gap-1.5 sm:gap-2 text-left min-w-0 flex-1 pr-2">
                              <ChevronRight className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0", txt3)} />
                              <span className={cn("font-medium text-xs sm:text-sm leading-snug sm:leading-normal", txt1)}>{item.title}</span>
                            </div>
                            {editMode && isAdmin && (
                              <div className="flex items-center gap-0.5 sm:gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                <Button size="sm" variant="ghost" className={cn("h-6 w-6 sm:h-7 sm:w-7 p-0", isDark ? "text-slate-400 hover:text-amber-400 hover:bg-amber-500/10" : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50")} onClick={() => openEdit(tab.id, item.id)}>
                                  <Pencil className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className={cn("h-6 w-6 sm:h-7 sm:w-7 p-0", isDark ? "text-slate-400 hover:text-red-400 hover:bg-red-500/10" : "text-slate-500 hover:text-red-600 hover:bg-red-50")} onClick={() => deleteItem(tab.id, item.id)}>
                                  <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                </Button>
                              </div>
                            )}
                          </AccordionTrigger>
                          <AccordionContent className={cn("text-xs sm:text-sm leading-relaxed pb-3 sm:pb-4 pl-4 sm:pl-6 pr-2 sm:pr-4", txt3)}>
                            {item.content.split("\n").map((p, i) => (
                              <p key={i} className={i > 0 ? "mt-2" : ""}>{p}</p>
                            ))}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        ))}
      </Tabs>

      {/* ── EDIT DIALOG ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className={cn("sm:max-w-lg max-h-[85vh] overflow-y-auto mx-2 sm:mx-0 rounded-xl", isDark ? "bg-[#15151e] border-white/10" : "")}>
          <DialogHeader>
            <DialogTitle className={cn("text-sm flex items-center gap-2", txt1)}>
              <Pencil className={cn("h-4 w-4", accent)} /> Edit Guide Item
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className={cn("text-xs font-medium", txt2)}>Title</Label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className={cn("mt-1", isDark ? "bg-white/5 border-white/10 text-white" : "")} />
            </div>
            <div>
              <Label className={cn("text-xs font-medium", txt2)}>Content</Label>
              <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} className={cn("mt-1 min-h-[180px] sm:min-h-[200px]", isDark ? "bg-white/5 border-white/10 text-white" : "")} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditOpen(false)} className={cn(isDark ? "border-white/10 text-slate-300" : "")}>Cancel</Button>
            <Button size="sm" className={cn("gap-1", accentBtn)} onClick={saveEdit}><Save className="h-3 w-3" /> Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ADD DIALOG ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className={cn("sm:max-w-lg max-h-[85vh] overflow-y-auto mx-2 sm:mx-0 rounded-xl", isDark ? "bg-[#15151e] border-white/10" : "")}>
          <DialogHeader>
            <DialogTitle className={cn("text-sm flex items-center gap-2", txt1)}>
              <Plus className={cn("h-4 w-4", accent)} /> Add Guide Item
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className={cn("text-xs font-medium", txt2)}>Title</Label>
              <Input value={addTitle} onChange={e => setAddTitle(e.target.value)} className={cn("mt-1", isDark ? "bg-white/5 border-white/10 text-white" : "")} />
            </div>
            <div>
              <Label className={cn("text-xs font-medium", txt2)}>Content</Label>
              <Textarea value={addContent} onChange={e => setAddContent(e.target.value)} className={cn("mt-1 min-h-[180px] sm:min-h-[200px]", isDark ? "bg-white/5 border-white/10 text-white" : "")} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" onClick={() => setAddOpen(false)} className={cn(isDark ? "border-white/10 text-slate-300" : "")}>Cancel</Button>
            <Button size="sm" className={cn("gap-1", accentBtn)} onClick={addItem}><Plus className="h-3 w-3" /> Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
