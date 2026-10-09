CREATE TABLE `rideMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rideId` varchar(36) NOT NULL,
	`sender` varchar(120) NOT NULL,
	`body` text NOT NULL,
	`isRead` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rideMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rides` (
	`id` varchar(36) NOT NULL,
	`riderKey` varchar(64) NOT NULL,
	`pickup` varchar(500) NOT NULL,
	`dropoff` varchar(500) NOT NULL,
	`pickupLat` double,
	`pickupLng` double,
	`status` enum('requested','assigned','arriving','in_progress','completed','cancelled') NOT NULL DEFAULT 'requested',
	`demoMode` int NOT NULL DEFAULT 1,
	`driverName` varchar(120),
	`vehicleName` varchar(120),
	`vehiclePlate` varchar(32),
	`locationLat` double,
	`locationLng` double,
	`locationUpdatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `ride_messages_ride_created_idx` ON `rideMessages` (`rideId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `rides_rider_created_idx` ON `rides` (`riderKey`,`createdAt`);