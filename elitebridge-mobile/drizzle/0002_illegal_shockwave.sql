CREATE TABLE `applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shiftId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','approved','rejected','accepted') DEFAULT 'pending',
	`rejectionReason` text,
	`appliedAt` timestamp NOT NULL DEFAULT (now()),
	`respondedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `backgroundChecks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`checkrId` varchar(255),
	`status` enum('pending','completed','clear','consider') DEFAULT 'pending',
	`result` json,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backgroundChecks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clockRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`shiftId` int NOT NULL,
	`clockInTime` timestamp NOT NULL,
	`clockOutTime` timestamp,
	`hoursWorked` decimal(5,2),
	`notes` text,
	`status` enum('in_progress','completed','approved') DEFAULT 'in_progress',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clockRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`participantIds` json NOT NULL,
	`lastMessage` text,
	`lastMessageAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`invoiceNumber` varchar(100) NOT NULL,
	`totalAmount` decimal(10,2) NOT NULL,
	`status` enum('pending','paid','overdue') DEFAULT 'pending',
	`items` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`dueAt` timestamp,
	`paidAt` timestamp,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_invoiceNumber_unique` UNIQUE(`invoiceNumber`)
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text NOT NULL,
	`city` varchar(100) NOT NULL,
	`state` varchar(50) NOT NULL,
	`zipCode` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`senderId` int NOT NULL,
	`content` text NOT NULL,
	`isRead` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`applicationId` int,
	`amount` decimal(10,2) NOT NULL,
	`status` enum('pending','completed','failed') DEFAULT 'pending',
	`stripePaymentId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ratings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fromUserId` int NOT NULL,
	`toUserId` int NOT NULL,
	`applicationId` int,
	`score` int NOT NULL,
	`review` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ratings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shiftAllocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shiftId` int NOT NULL,
	`caregiverId` int NOT NULL,
	`allocatedBy` int NOT NULL,
	`status` enum('allocated','accepted','declined','completed','cancelled') DEFAULT 'allocated',
	`allocationMessage` text,
	`respondedAt` timestamp,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`allocatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shiftAllocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `type` enum('shift_posted','application_status','message','payment','background_check') NOT NULL;--> statement-breakpoint
ALTER TABLE `shiftMatchingHistory` MODIFY COLUMN `availabilityScore` decimal(5,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `shiftMatchingHistory` MODIFY COLUMN `serviceTypeScore` decimal(5,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `shiftMatchingHistory` MODIFY COLUMN `locationScore` decimal(5,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `shiftMatchingHistory` MODIFY COLUMN `rateScore` decimal(5,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `shiftMatchingHistory` MODIFY COLUMN `ratingScore` decimal(5,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `notifications` ADD `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` ADD `data` json;--> statement-breakpoint
ALTER TABLE `notifications` ADD `isRead` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `shiftMatchingHistory` ADD `totalScore` decimal(5,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `notifications` DROP COLUMN `caregiverId`;--> statement-breakpoint
ALTER TABLE `notifications` DROP COLUMN `relatedShiftId`;--> statement-breakpoint
ALTER TABLE `notifications` DROP COLUMN `relatedOfferId`;--> statement-breakpoint
ALTER TABLE `notifications` DROP COLUMN `read`;--> statement-breakpoint
ALTER TABLE `shiftMatchingHistory` DROP COLUMN `hoursScore`;