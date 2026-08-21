-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Attendance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clockIn" TIMESTAMP(3),
    "clockOut" TIMESTAMP(3),
    "totalHours" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'present',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lateReason" TEXT,
    "leaveReason" TEXT,
    "markedBy" TEXT,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Automation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" TEXT NOT NULL,
    "triggerConfig" TEXT NOT NULL DEFAULT '{}',
    "templateId" TEXT,
    "action" TEXT NOT NULL DEFAULT 'send_email',
    "actionConfig" TEXT NOT NULL DEFAULT '{}',
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BetaInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'enterprise',
    "invitedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "trialDays" INTEGER NOT NULL DEFAULT 14,
    "expiresAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BetaInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ClientMessage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "parentMessageId" TEXT,
    "direction" TEXT NOT NULL,
    "senderUserId" TEXT,
    "senderName" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "senderAvatar" TEXT,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" JSONB,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "isReadByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isReadByClient" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "scheduledFor" TIMESTAMP(3),
    "deadlineDate" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "relatedInvoiceId" TEXT,
    "relatedReportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "actions" JSONB,
    "isSystemMessage" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,

    CONSTRAINT "ClientMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Coupon" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'percentage',
    "value" DECIMAL(10,2) NOT NULL,
    "minOrder" DECIMAL(10,2),
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Customer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "address" TEXT,
    "loyaltyTier" TEXT NOT NULL DEFAULT 'new',
    "totalSpent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailTemplate" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT NOT NULL DEFAULT '',
    "variables" TEXT NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Expense" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Feedback" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rating" INTEGER,
    "content" TEXT NOT NULL,
    "authorName" TEXT,
    "authorCompany" TEXT,
    "videoUrl" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IntegrationConnection" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "config" TEXT,
    "connectedAt" TIMESTAMP(3),
    "metadata" TEXT,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "paymentProofId" TEXT,
    "planName" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "type" TEXT NOT NULL DEFAULT 'subscription',
    "currencyCode" TEXT NOT NULL DEFAULT 'PKR',
    "currencySymbol" TEXT NOT NULL DEFAULT 'Rs.',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "notes" TEXT,
    "pdfUrl" TEXT,
    "orgName" TEXT,
    "orgEmail" TEXT,
    "orgPhone" TEXT,
    "orgAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "clientAddress" TEXT,
    "clientEmail" TEXT,
    "clientName" TEXT,
    "createdBy" TEXT,
    "discountAmount" DECIMAL(10,2),
    "invoiceTitle" TEXT,
    "lineItems" JSONB,
    "paymentStatus" TEXT,
    "sentAt" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2),
    "taxAmount" DECIMAL(10,2),
    "taxRate" DECIMAL(5,2),

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Lead" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "companySize" TEXT,
    "industry" TEXT,
    "interest" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "source" TEXT NOT NULL DEFAULT 'website',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "consultationType" TEXT,
    "preferredDate" TEXT,
    "preferredTime" TEXT,
    "timezone" TEXT,
    "availabilityNote" TEXT,
    "calendlyBookingLink" TEXT,
    "lastFollowUpAt" TIMESTAMP(3),
    "followUpCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LegalPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actionUrl" TEXT,
    "icon" TEXT,
    "orgId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "channel" TEXT NOT NULL DEFAULT 'manual',
    "courier" TEXT,
    "trackingNumber" TEXT,
    "notes" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workingHoursEnd" TEXT NOT NULL DEFAULT '18:00',
    "workingHoursStart" TEXT NOT NULL DEFAULT '09:00',
    "address" TEXT,
    "brandColor" TEXT,
    "brandDescription" TEXT,
    "brandTagline" TEXT,
    "country" TEXT,
    "favicon" TEXT,
    "religion" TEXT,
    "secondaryBrandColor" TEXT,
    "taxId" TEXT,
    "banReason" TEXT,
    "bannedAt" TIMESTAMP(3),
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "paymentRejectionCount" INTEGER NOT NULL DEFAULT 0,
    "usageOrdersCount" INTEGER NOT NULL DEFAULT 0,
    "usageProductsCount" INTEGER NOT NULL DEFAULT 0,
    "usageCustomersCount" INTEGER NOT NULL DEFAULT 0,
    "usageStorageMb" INTEGER NOT NULL DEFAULT 0,
    "usageInvoicesCount" INTEGER NOT NULL DEFAULT 0,
    "usageCouponsCount" INTEGER NOT NULL DEFAULT 0,
    "usageTasksCount" INTEGER NOT NULL DEFAULT 0,
    "usageTeamChatsCount" INTEGER NOT NULL DEFAULT 0,
    "usageBroadcastsCount" INTEGER NOT NULL DEFAULT 0,
    "usageLastResetAt" TIMESTAMP(3),
    "industry" TEXT,
    "orderCounter" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roleId" TEXT,
    "absenceCount" INTEGER NOT NULL DEFAULT 0,
    "penaltyUntil" TIMESTAMP(3),
    "pin" TEXT,
    "pinCreatedAt" TIMESTAMP(3),

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentProof" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "transactionId" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'bank_transfer',
    "screenshotUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "adminNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "planId" TEXT,
    "clientNote" TEXT,

    CONSTRAINT "PaymentProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlatformDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileType" TEXT NOT NULL DEFAULT 'document',
    "cloudinaryUrl" TEXT,
    "cloudinaryPublicId" TEXT,
    "category" TEXT NOT NULL DEFAULT 'uploaded',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "PlatformDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlatformSettings" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT 'Valtriox',
    "companyEmail" TEXT NOT NULL,
    "companyPhone" TEXT,
    "companyWebsite" TEXT,
    "companyAddress" TEXT,
    "supportHours" TEXT NOT NULL DEFAULT 'Mon-Fri: 9AM-6PM PKT',
    "whatsappNumber" TEXT,
    "instagramUrl" TEXT,
    "facebookUrl" TEXT,
    "twitterUrl" TEXT,
    "paymentMethods" TEXT NOT NULL DEFAULT '[]',
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "primaryBrandColor" TEXT NOT NULL DEFAULT '#059669',
    "secondaryBrandColor" TEXT NOT NULL DEFAULT '#d97706',
    "currencySymbol" TEXT NOT NULL DEFAULT 'Rs.',
    "customCss" TEXT NOT NULL DEFAULT '',
    "emailFooterText" TEXT,
    "invoiceHeaderText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tagline" TEXT NOT NULL DEFAULT 'Premium Brand Management Portal',
    "showInstagram" BOOLEAN NOT NULL DEFAULT false,
    "showFacebook" BOOLEAN NOT NULL DEFAULT false,
    "showTwitter" BOOLEAN NOT NULL DEFAULT false,
    "showLinkedin" BOOLEAN NOT NULL DEFAULT false,
    "showDiscord" BOOLEAN NOT NULL DEFAULT false,
    "showReddit" BOOLEAN NOT NULL DEFAULT false,
    "showYoutube" BOOLEAN NOT NULL DEFAULT false,
    "showTiktok" BOOLEAN NOT NULL DEFAULT false,
    "showWhatsApp" BOOLEAN NOT NULL DEFAULT false,
    "linkedinUrl" TEXT,
    "discordUrl" TEXT,
    "redditUrl" TEXT,
    "youtubeUrl" TEXT,
    "tiktokUrl" TEXT,
    "socialLinksVisible" TEXT NOT NULL DEFAULT 'true',
    "founderBio" TEXT,
    "founderImageUrl" TEXT,
    "leadMagnetTitle" TEXT,
    "leadMagnetDescription" TEXT,
    "leadMagnetEmailSubject" TEXT,
    "leadMagnetEmailBody" TEXT,
    "leadMagnetPdfUrl" TEXT,
    "leadMagnetSentCount" INTEGER NOT NULL DEFAULT 0,
    "leadMagnetDownloadCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "costPrice" DECIMAL(10,2),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Proposal" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "clientCompany" TEXT,
    "clientPhone" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "totalCost" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "currencySymbol" TEXT NOT NULL DEFAULT 'Rs.',
    "validUntil" TIMESTAMP(3),
    "content" TEXT NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "payproOrderId" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "paidAt" TIMESTAMP(3),
    "paymentAmount" DECIMAL(10,2),

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "endpoint" TEXT NOT NULL,
    "keysAuth" TEXT NOT NULL,
    "keysP256dh" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReportExport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "dateFrom" TIMESTAMP(3),
    "dateTo" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "generatedById" TEXT,
    "recipientEmail" TEXT,
    "emailedAt" TIMESTAMP(3),
    "emailStatus" TEXT,
    "fileSizeKb" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT NOT NULL DEFAULT '{}',
    "level" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'trial',
    "trialStartsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndsAt" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "lastReminderAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'monthly',
    "features" TEXT NOT NULL DEFAULT '[]',
    "teamLimit" INTEGER NOT NULL DEFAULT 3,
    "orderLimit" INTEGER NOT NULL DEFAULT 100,
    "productLimit" INTEGER NOT NULL DEFAULT 50,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "trialDays" INTEGER NOT NULL DEFAULT 14,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "annualPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "quarterlyPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SupportConversation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "orgName" TEXT NOT NULL,
    "lastMessage" TEXT NOT NULL DEFAULT '',
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unreadAdmin" INTEGER NOT NULL DEFAULT 0,
    "unreadClient" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SupportMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderAvatar" TEXT,
    "senderRole" TEXT NOT NULL DEFAULT 'member',
    "content" TEXT NOT NULL DEFAULT '',
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "attachmentData" TEXT,
    "voiceNoteData" TEXT,
    "callInfoData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamInvitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeEmail" TEXT NOT NULL,
    "inviteeName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "roleId" TEXT,
    "pin" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamTask" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assignedTo" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password" TEXT,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "otpCode" TEXT,
    "otpExpires" TIMESTAMP(3),
    "otpVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ValtrioxTeamInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'platform_admin',
    "department" TEXT,
    "invitedBy" TEXT,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "ValtrioxTeamInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ValtrioxTeamMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'platform_admin',
    "department" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "invitedBy" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActive" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "visibleSections" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "ValtrioxTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."suppliers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "category" TEXT NOT NULL DEFAULT 'General',
    "status" TEXT NOT NULL DEFAULT 'active',
    "address" TEXT,
    "notes" TEXT,
    "rating" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- AddConstraint
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_provider_providerAccountId_key" UNIQUE ("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "public"."Account"("userId" ASC);

-- CreateIndex
CREATE INDEX "Attendance_organizationId_date_idx" ON "public"."Attendance"("organizationId" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "Attendance_organizationId_status_idx" ON "public"."Attendance"("organizationId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "Attendance_userId_date_idx" ON "public"."Attendance"("userId" ASC, "date" ASC);

-- AddConstraint
ALTER TABLE "public"."Attendance" ADD CONSTRAINT "Attendance_userId_organizationId_date_key" UNIQUE ("userId", "organizationId", "date");

-- CreateIndex
CREATE INDEX "Automation_enabled_idx" ON "public"."Automation"("enabled" ASC);

-- CreateIndex
CREATE INDEX "Automation_trigger_idx" ON "public"."Automation"("trigger" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "BetaInvite_email_key" ON "public"."BetaInvite"("email" ASC);

-- CreateIndex
CREATE INDEX "BetaInvite_invitedBy_idx" ON "public"."BetaInvite"("invitedBy" ASC);

-- CreateIndex
CREATE INDEX "BetaInvite_status_idx" ON "public"."BetaInvite"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "BetaInvite_token_key" ON "public"."BetaInvite"("token" ASC);

-- CreateIndex
CREATE INDEX "ClientMessage_createdAt_idx" ON "public"."ClientMessage"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "ClientMessage_isArchived_idx" ON "public"."ClientMessage"("isArchived" ASC);

-- CreateIndex
CREATE INDEX "ClientMessage_organizationId_category_idx" ON "public"."ClientMessage"("organizationId" ASC, "category" ASC);

-- CreateIndex
CREATE INDEX "ClientMessage_organizationId_direction_idx" ON "public"."ClientMessage"("organizationId" ASC, "direction" ASC);

-- CreateIndex
CREATE INDEX "ClientMessage_scheduledFor_idx" ON "public"."ClientMessage"("scheduledFor" ASC);

-- CreateIndex
CREATE INDEX "ClientMessage_threadId_idx" ON "public"."ClientMessage"("threadId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_organizationId_code_key" ON "public"."Coupon"("organizationId" ASC, "code" ASC);

-- CreateIndex
CREATE INDEX "Coupon_organizationId_expiresAt_idx" ON "public"."Coupon"("organizationId" ASC, "expiresAt" ASC);

-- CreateIndex
CREATE INDEX "Coupon_organizationId_isActive_idx" ON "public"."Coupon"("organizationId" ASC, "isActive" ASC);

-- CreateIndex
CREATE INDEX "Customer_organizationId_createdAt_idx" ON "public"."Customer"("organizationId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "Customer_organizationId_email_idx" ON "public"."Customer"("organizationId" ASC, "email" ASC);

-- CreateIndex
CREATE INDEX "Customer_organizationId_loyaltyTier_idx" ON "public"."Customer"("organizationId" ASC, "loyaltyTier" ASC);

-- CreateIndex
CREATE INDEX "Customer_organizationId_totalSpent_idx" ON "public"."Customer"("organizationId" ASC, "totalSpent" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_type_key" ON "public"."EmailTemplate"("type" ASC);

-- CreateIndex
CREATE INDEX "Expense_organizationId_category_idx" ON "public"."Expense"("organizationId" ASC, "category" ASC);

-- CreateIndex
CREATE INDEX "Expense_organizationId_date_idx" ON "public"."Expense"("organizationId" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "Feedback_organizationId_type_idx" ON "public"."Feedback"("organizationId" ASC, "type" ASC);

-- CreateIndex
CREATE INDEX "Feedback_status_idx" ON "public"."Feedback"("status" ASC);

-- CreateIndex
CREATE INDEX "IntegrationConnection_organizationId_idx" ON "public"."IntegrationConnection"("organizationId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConnection_organizationId_type_key" ON "public"."IntegrationConnection"("organizationId" ASC, "type" ASC);

-- CreateIndex
CREATE INDEX "IntegrationConnection_status_idx" ON "public"."IntegrationConnection"("status" ASC);

-- CreateIndex
CREATE INDEX "IntegrationConnection_type_idx" ON "public"."IntegrationConnection"("type" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "public"."Invoice"("invoiceNumber" ASC);

-- CreateIndex
CREATE INDEX "Invoice_organizationId_idx" ON "public"."Invoice"("organizationId" ASC);

-- CreateIndex
CREATE INDEX "Invoice_organizationId_status_idx" ON "public"."Invoice"("organizationId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "Invoice_paymentStatus_idx" ON "public"."Invoice"("paymentStatus" ASC);

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "public"."Invoice"("status" ASC);

-- CreateIndex
CREATE INDEX "Invoice_type_idx" ON "public"."Invoice"("type" ASC);

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "public"."Lead"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "public"."Lead"("email" ASC);

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "public"."Lead"("status" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "public"."Lead"("status" ASC);

-- AddConstraint
ALTER TABLE "public"."LegalPage" ADD CONSTRAINT "LegalPage_slug_key" UNIQUE ("slug");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "public"."Notification"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Notification_orgId_idx" ON "public"."Notification"("orgId" ASC);

-- CreateIndex
CREATE INDEX "Notification_orgId_read_idx" ON "public"."Notification"("orgId" ASC, "read" ASC);

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "public"."Notification"("read" ASC);

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "public"."Notification"("type" ASC);

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "public"."Notification"("userId" ASC);

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "public"."Notification"("userId" ASC, "read" ASC);

-- CreateIndex
CREATE INDEX "Order_channel_idx" ON "public"."Order"("channel" ASC);

-- CreateIndex
CREATE INDEX "Order_orderNumber_idx" ON "public"."Order"("orderNumber" ASC);

-- CreateIndex
CREATE INDEX "Order_organizationId_createdAt_idx" ON "public"."Order"("organizationId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "Order_organizationId_customerId_idx" ON "public"."Order"("organizationId" ASC, "customerId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Order_organizationId_orderNumber_key" ON "public"."Order"("organizationId" ASC, "orderNumber" ASC);

-- CreateIndex
CREATE INDEX "Order_organizationId_status_idx" ON "public"."Order"("organizationId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "public"."OrderItem"("orderId" ASC);

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "public"."OrderItem"("productId" ASC);

-- CreateIndex
CREATE INDEX "Organization_isActive_idx" ON "public"."Organization"("isActive" ASC);

-- CreateIndex
CREATE INDEX "Organization_plan_idx" ON "public"."Organization"("plan" ASC);

-- AddConstraint
ALTER TABLE "public"."Organization" ADD CONSTRAINT "Organization_slug_key" UNIQUE ("slug");

-- CreateIndex
CREATE INDEX "OrganizationMember_organizationId_role_idx" ON "public"."OrganizationMember"("organizationId" ASC, "role" ASC);

-- AddConstraint
ALTER TABLE "public"."OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_userId_key" UNIQUE ("organizationId", "userId");

-- CreateIndex
CREATE INDEX "PaymentProof_organizationId_idx" ON "public"."PaymentProof"("organizationId" ASC);

-- CreateIndex
CREATE INDEX "PaymentProof_status_idx" ON "public"."PaymentProof"("status" ASC);

-- CreateIndex
CREATE INDEX "PaymentProof_subscriptionId_idx" ON "public"."PaymentProof"("subscriptionId" ASC);

-- CreateIndex
CREATE INDEX "PlatformDocument_category_idx" ON "public"."PlatformDocument"("category" ASC);

-- CreateIndex
CREATE INDEX "PlatformDocument_fileType_idx" ON "public"."PlatformDocument"("fileType" ASC);

-- CreateIndex
CREATE INDEX "PlatformDocument_isActive_idx" ON "public"."PlatformDocument"("isActive" ASC);

-- CreateIndex
CREATE INDEX "PlatformDocument_organizationId_idx" ON "public"."PlatformDocument"("organizationId" ASC);

-- CreateIndex
CREATE INDEX "Product_organizationId_category_idx" ON "public"."Product"("organizationId" ASC, "category" ASC);

-- CreateIndex
CREATE INDEX "Product_organizationId_createdAt_idx" ON "public"."Product"("organizationId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "Product_organizationId_status_idx" ON "public"."Product"("organizationId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "Product_organizationId_stock_idx" ON "public"."Product"("organizationId" ASC, "stock" ASC);

-- CreateIndex
CREATE INDEX "Proposal_clientEmail_idx" ON "public"."Proposal"("clientEmail" ASC);

-- CreateIndex
CREATE INDEX "Proposal_createdAt_idx" ON "public"."Proposal"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Proposal_leadId_idx" ON "public"."Proposal"("leadId" ASC);

-- CreateIndex
CREATE INDEX "Proposal_paymentStatus_idx" ON "public"."Proposal"("paymentStatus" ASC);

-- CreateIndex
CREATE INDEX "Proposal_status_idx" ON "public"."Proposal"("status" ASC);

-- CreateIndex
CREATE INDEX "Proposal_type_idx" ON "public"."Proposal"("type" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "public"."PushSubscription"("endpoint" ASC);

-- CreateIndex
CREATE INDEX "PushSubscription_orgId_idx" ON "public"."PushSubscription"("orgId" ASC);

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "public"."PushSubscription"("userId" ASC);

-- CreateIndex
CREATE INDEX "ReportExport_createdAt_idx" ON "public"."ReportExport"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "ReportExport_organizationId_idx" ON "public"."ReportExport"("organizationId" ASC);

-- CreateIndex
CREATE INDEX "ReportExport_type_idx" ON "public"."ReportExport"("type" ASC);

-- AddConstraint
ALTER TABLE "public"."Role" ADD CONSTRAINT "Role_name_key" UNIQUE ("name");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken" ASC);

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId" ASC);

-- AddConstraint
ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_organizationId_key" UNIQUE ("organizationId");

-- CreateIndex
CREATE INDEX "Subscription_organizationId_status_idx" ON "public"."Subscription"("organizationId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "public"."Subscription"("status" ASC);

-- AddConstraint
ALTER TABLE "public"."SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_name_key" UNIQUE ("name");

-- CreateIndex
CREATE INDEX "SupportConversation_lastMessageAt_idx" ON "public"."SupportConversation"("lastMessageAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "SupportConversation_organizationId_key" ON "public"."SupportConversation"("organizationId" ASC);

-- CreateIndex
CREATE INDEX "SupportMessage_conversationId_createdAt_idx" ON "public"."SupportMessage"("conversationId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "public"."SystemSetting"("key" ASC);

-- CreateIndex
CREATE INDEX "TeamInvitation_expiresAt_idx" ON "public"."TeamInvitation"("expiresAt" ASC);

-- CreateIndex
CREATE INDEX "TeamInvitation_inviteeEmail_idx" ON "public"."TeamInvitation"("inviteeEmail" ASC);

-- CreateIndex
CREATE INDEX "TeamInvitation_organizationId_idx" ON "public"."TeamInvitation"("organizationId" ASC);

-- CreateIndex
CREATE INDEX "TeamInvitation_organizationId_status_idx" ON "public"."TeamInvitation"("organizationId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "TeamInvitation_status_idx" ON "public"."TeamInvitation"("status" ASC);

-- CreateIndex
CREATE INDEX "TeamTask_assignedTo_idx" ON "public"."TeamTask"("assignedTo" ASC);

-- CreateIndex
CREATE INDEX "TeamTask_organizationId_dueDate_idx" ON "public"."TeamTask"("organizationId" ASC, "dueDate" ASC);

-- CreateIndex
CREATE INDEX "TeamTask_organizationId_priority_idx" ON "public"."TeamTask"("organizationId" ASC, "priority" ASC);

-- CreateIndex
CREATE INDEX "TeamTask_organizationId_status_idx" ON "public"."TeamTask"("organizationId" ASC, "status" ASC);

-- AddConstraint
ALTER TABLE "public"."User" ADD CONSTRAINT "User_email_key" UNIQUE ("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role" ASC);

-- CreateIndex
CREATE INDEX "ValtrioxTeamInvitation_email_idx" ON "public"."ValtrioxTeamInvitation"("email" ASC);

-- CreateIndex
CREATE INDEX "ValtrioxTeamInvitation_status_idx" ON "public"."ValtrioxTeamInvitation"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ValtrioxTeamInvitation_token_key" ON "public"."ValtrioxTeamInvitation"("token" ASC);

-- CreateIndex
CREATE INDEX "ValtrioxTeamMember_department_idx" ON "public"."ValtrioxTeamMember"("department" ASC);

-- CreateIndex
CREATE INDEX "ValtrioxTeamMember_status_idx" ON "public"."ValtrioxTeamMember"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ValtrioxTeamMember_userId_key" ON "public"."ValtrioxTeamMember"("userId" ASC);

-- AddConstraint
ALTER TABLE "public"."VerificationToken" ADD CONSTRAINT "VerificationToken_identifier_token_key" UNIQUE ("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token" ASC);

-- CreateIndex
CREATE INDEX "suppliers_organization_id_category_idx" ON "public"."suppliers"("organization_id" ASC, "category" ASC);

-- CreateIndex
CREATE INDEX "suppliers_organization_id_idx" ON "public"."suppliers"("organization_id" ASC);

-- CreateIndex
CREATE INDEX "suppliers_organization_id_status_idx" ON "public"."suppliers"("organization_id" ASC, "status" ASC);

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attendance" ADD CONSTRAINT "Attendance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Automation" ADD CONSTRAINT "Automation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientMessage" ADD CONSTRAINT "ClientMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Coupon" ADD CONSTRAINT "Coupon_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Feedback" ADD CONSTRAINT "Feedback_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_paymentProofId_fkey" FOREIGN KEY ("paymentProofId") REFERENCES "public"."PaymentProof"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationMember" ADD CONSTRAINT "OrganizationMember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentProof" ADD CONSTRAINT "PaymentProof_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentProof" ADD CONSTRAINT "PaymentProof_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentProof" ADD CONSTRAINT "PaymentProof_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlatformDocument" ADD CONSTRAINT "PlatformDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Proposal" ADD CONSTRAINT "Proposal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReportExport" ADD CONSTRAINT "ReportExport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupportMessage" ADD CONSTRAINT "SupportMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."SupportConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamInvitation" ADD CONSTRAINT "TeamInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamInvitation" ADD CONSTRAINT "TeamInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamTask" ADD CONSTRAINT "TeamTask_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamTask" ADD CONSTRAINT "TeamTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ValtrioxTeamMember" ADD CONSTRAINT "ValtrioxTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."suppliers" ADD CONSTRAINT "suppliers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

