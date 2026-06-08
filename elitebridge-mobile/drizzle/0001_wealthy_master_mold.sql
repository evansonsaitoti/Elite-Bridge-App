CREATE TABLE `caregiverPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caregiverId` int NOT NULL,
	`mondayAvailable` boolean DEFAULT false,
	`mondayStartTime` varchar(5),
	`mondayEndTime` varchar(5),
	`tuesdayAvailable` boolean DEFAULT false,
	`tuesdayStartTime` varchar(5),
	`tuesdayEndTime` varchar(5),
	`wednesdayAvailable` boolean DEFAULT false,
	`wednesdayStartTime` varchar(5),
	`wednesdayEndTime` varchar(5),
	`thursdayAvailable` boolean DEFAULT false,
	`thursdayStartTime` varchar(5),
	`thursdayEndTime` varchar(5),
	`fridayAvailable` boolean DEFAULT false,
	`fridayStartTime` varchar(5),
	`fridayEndTime` varchar(5),
	`saturdayAvailable` boolean DEFAULT false,
	`saturdayStartTime` varchar(5),
	`saturdayEndTime` varchar(5),
	`sundayAvailable` boolean DEFAULT false,
	`sundayStartTime` varchar(5),
	`sundayEndTime` varchar(5),
	`elderCareWilling` boolean DEFAULT false,
	`childCareWilling` boolean DEFAULT false,
	`disabilityCareWilling` boolean DEFAULT false,
	`minHourlyRate` decimal(8,2),
	`maxHoursPerWeek` int,
	`travelPreference` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `caregiverPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `caregiverPreferences_caregiverId_unique` UNIQUE(`caregiverId`)
);
--> statement-breakpoint
CREATE TABLE `caregiverProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`licenseNumber` varchar(50),
	`licenseExpiry` timestamp,
	`taxId` varchar(50),
	`bankAccountId` varchar(100),
	`backgroundCheckStatus` enum('pending','approved','rejected') DEFAULT 'pending',
	`backgroundCheckId` varchar(100),
	`averageRating` decimal(3,2) DEFAULT '0',
	`totalRatings` int DEFAULT 0,
	`completedShifts` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `caregiverProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `caregiverProfiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `caregiverRatings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caregiverId` int NOT NULL,
	`clientId` int NOT NULL,
	`shiftId` int,
	`rating` int NOT NULL,
	`review` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `caregiverRatings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caregiverId` int NOT NULL,
	`type` enum('shift_match','shift_offer','shift_accepted','shift_completed','rating_received','payment_processed') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`relatedShiftId` int,
	`relatedOfferId` int,
	`read` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shiftMatchingHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shiftId` int NOT NULL,
	`caregiverId` int NOT NULL,
	`matchScore` decimal(5,2) NOT NULL,
	`availabilityScore` decimal(5,2) DEFAULT 0,
	`serviceTypeScore` decimal(5,2) DEFAULT 0,
	`locationScore` decimal(5,2) DEFAULT 0,
	`rateScore` decimal(5,2) DEFAULT 0,
	`ratingScore` decimal(5,2) DEFAULT 0,
	`hoursScore` decimal(5,2) DEFAULT 0,
	`matchedAt` timestamp NOT NULL DEFAULT (now()),
	`offerSent` boolean DEFAULT false,
	`offerAccepted` boolean DEFAULT false,
	`acceptedAt` timestamp,
	CONSTRAINT `shiftMatchingHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shiftOffers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shiftId` int NOT NULL,
	`caregiverId` int NOT NULL,
	`status` enum('pending','accepted','declined','expired') DEFAULT 'pending',
	`offerMessage` text,
	`expiresAt` timestamp NOT NULL,
	`respondedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shiftOffers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`serviceType` enum('companion','personal_care','household','mobility_assistance') NOT NULL,
	`location` varchar(255) NOT NULL,
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`hourlyRate` decimal(8,2) NOT NULL,
	`requiredExperience` int DEFAULT 0,
	`maxCaregivers` int DEFAULT 1,
	`status` enum('open','in_progress','completed','cancelled') DEFAULT 'open',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shifts_id` PRIMARY KEY(`id`)
);
