-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: new_swiftbim
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `bim_enquiry`
--

DROP TABLE IF EXISTS `bim_enquiry`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bim_enquiry` (
  `id` int NOT NULL AUTO_INCREMENT,
  `source` enum('SELF','GUEST') NOT NULL DEFAULT 'GUEST',
  `project_type_sector` longtext,
  `client_type` varchar(255) DEFAULT NULL,
  `project_stage` text,
  `project_location` varchar(100) DEFAULT NULL,
  `project_size` varchar(200) DEFAULT NULL,
  `projectstart_date` date DEFAULT NULL,
  `completion_timeline` varchar(150) DEFAULT NULL,
  `upload_file` varchar(300) DEFAULT NULL,
  `full_name` varchar(300) DEFAULT NULL,
  `country` varchar(200) DEFAULT NULL,
  `company_name` varchar(200) DEFAULT NULL,
  `email_address` varchar(200) DEFAULT NULL,
  `whatsapp_number` varchar(20) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'In Discussion',
  `is_registered` tinyint(1) DEFAULT '0',
  `client_status` varchar(50) DEFAULT 'Not Confirmed',
  `state` varchar(100) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `project_description` text,
  `address` text,
  `designation` varchar(255) DEFAULT NULL,
  `disciplines_required` text,
  `bim_services_required` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bim_enquiry`
--

LOCK TABLES `bim_enquiry` WRITE;
/*!40000 ALTER TABLE `bim_enquiry` DISABLE KEYS */;
/*!40000 ALTER TABLE `bim_enquiry` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `client_meetings`
--

DROP TABLE IF EXISTS `client_meetings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_meetings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `meeting_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `mode` varchar(32) DEFAULT NULL,
  `meeting_link` varchar(512) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `description` text,
  `target_roles` varchar(255) NOT NULL DEFAULT 'technical_team,bim_consultant,commercial_team,verification_team',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_client_date` (`client_id`,`meeting_date`),
  KEY `idx_meeting_date` (`meeting_date`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client_meetings`
--

LOCK TABLES `client_meetings` WRITE;
/*!40000 ALTER TABLE `client_meetings` DISABLE KEYS */;
/*!40000 ALTER TABLE `client_meetings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `commercial_status`
--

DROP TABLE IF EXISTS `commercial_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `commercial_status` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proposal_id` int NOT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `commercial_status` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commercial_status`
--

LOCK TABLES `commercial_status` WRITE;
/*!40000 ALTER TABLE `commercial_status` DISABLE KEYS */;
/*!40000 ALTER TABLE `commercial_status` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `consultations`
--

DROP TABLE IF EXISTS `consultations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consultations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `company_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `role` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `project_location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `consultation_mode` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `preferred_date` date DEFAULT NULL,
  `preferred_time` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `project_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `consultations`
--

LOCK TABLES `consultations` WRITE;
/*!40000 ALTER TABLE `consultations` DISABLE KEYS */;
/*!40000 ALTER TABLE `consultations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contracts`
--

DROP TABLE IF EXISTS `contracts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contracts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `contract_id` varchar(50) NOT NULL,
  `proposal_id` int NOT NULL,
  `client_id` int NOT NULL,
  `provider_id` int DEFAULT '1',
  `contract_date` date DEFAULT NULL,
  `ref_no` varchar(50) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'Draft',
  `total_cost` decimal(10,2) DEFAULT NULL,
  `advance_payment` decimal(10,2) DEFAULT NULL,
  `milestone_payment` decimal(10,2) DEFAULT NULL,
  `final_payment` decimal(10,2) DEFAULT NULL,
  `client_signature` longtext,
  `provider_signature` longtext,
  `full_contract_data` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contract_id` (`contract_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contracts`
--

LOCK TABLES `contracts` WRITE;
/*!40000 ALTER TABLE `contracts` DISABLE KEYS */;
/*!40000 ALTER TABLE `contracts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dropdown_options`
--

DROP TABLE IF EXISTS `dropdown_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dropdown_options` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `option_value` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_option` (`category`,`option_value`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dropdown_options`
--

LOCK TABLES `dropdown_options` WRITE;
/*!40000 ALTER TABLE `dropdown_options` DISABLE KEYS */;
INSERT INTO `dropdown_options` VALUES (1,'Buildings','Residential – Villa / Housing',1,'2026-02-19 13:35:13'),(2,'Buildings','Residential – Apartment / High‑rise',1,'2026-02-19 13:35:13'),(3,'Buildings','Commercial – Office',1,'2026-02-19 13:35:13'),(4,'Buildings','Commercial – Retail / Mall',1,'2026-02-19 13:35:13'),(5,'Buildings','Hotel / Hospitality',1,'2026-02-19 13:35:13'),(6,'Buildings','Hospital / Healthcare',1,'2026-02-19 13:35:13'),(7,'Buildings','Education (School / College)',1,'2026-02-19 13:35:13'),(8,'Buildings','Industrial / Warehouse',1,'2026-02-19 13:35:13'),(9,'Buildings','Data Center',1,'2026-02-19 13:35:13'),(10,'Buildings','Interior Fit‑Out',1,'2026-02-19 13:35:13'),(11,'Buildings','Renovation / Refurbishment',1,'2026-02-19 13:35:13'),(12,'Infrastructure','Roads / Highways',1,'2026-02-19 13:35:13'),(13,'Infrastructure','Bridges / Flyovers',1,'2026-02-19 13:35:13'),(14,'Infrastructure','Rail / Metro',1,'2026-02-19 13:35:13'),(15,'Infrastructure','Airport',1,'2026-02-19 13:35:13'),(16,'Infrastructure','Tunnels',1,'2026-02-19 13:35:13'),(17,'Infrastructure','Ports / Harbors',1,'2026-02-19 13:35:13'),(18,'Infrastructure','Water Treatment / Sewage Plant',1,'2026-02-19 13:35:13'),(19,'Infrastructure','Utilities / Pipelines',1,'2026-02-19 13:35:13'),(20,'Infrastructure','Power / Substation',1,'2026-02-19 13:35:13'),(21,'Urban Development','Mixed‑Use Development',1,'2026-02-19 13:35:13'),(22,'Urban Development','Township / Master Plan',1,'2026-02-19 13:35:13'),(23,'Urban Development','Smart City',1,'2026-02-19 13:35:13');
/*!40000 ALTER TABLE `dropdown_options` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `newsletter_subscribers`
--

DROP TABLE IF EXISTS `newsletter_subscribers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `newsletter_subscribers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `source` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'website',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `newsletter_subscribers`
--

LOCK TABLES `newsletter_subscribers` WRITE;
/*!40000 ALTER TABLE `newsletter_subscribers` DISABLE KEYS */;
/*!40000 ALTER TABLE `newsletter_subscribers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `reference_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reference_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_role` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_otps`
--

DROP TABLE IF EXISTS `password_reset_otps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_otps` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `otp_code` varchar(6) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime NOT NULL,
  `is_used` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_email` (`email`),
  KEY `idx_expires` (`expires_at`),
  KEY `idx_otp_lookup` (`email`,`otp_code`,`is_used`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_otps`
--

LOCK TABLES `password_reset_otps` WRITE;
/*!40000 ALTER TABLE `password_reset_otps` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_otps` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `proposals`
--

DROP TABLE IF EXISTS `proposals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proposals` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `executive_summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `service_id` int unsigned DEFAULT NULL,
  `aboutus` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website_url` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `scope_of_work` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `technologies_used` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `deliverables` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `deliverables_intro` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `deliverables_list` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `exclusions` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `exclusions_list` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `commercial_offer` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `payment_terms` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `price` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `technical_status` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `commercial_status` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verification_status` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `client_status` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resources` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resource_unit` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_price` int DEFAULT NULL,
  `assigned_to` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rework_reason` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_proposals_service_id` (`service_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `proposals`
--

LOCK TABLES `proposals` WRITE;
/*!40000 ALTER TABLE `proposals` DISABLE KEYS */;
/*!40000 ALTER TABLE `proposals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `company_details` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `role` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'client' COMMENT 'client | technical_team | commercial_team | verification_team',
  `enquiry_service_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Links to bim_enquiry.id',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `enquiry_id` (`enquiry_service_id`)
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (44,'prajwal','prajwalgpatil2002@gmail.com','pbkdf2:sha256:600000$t4yMXdKxuhLh7M7Y$268174c574ca1d617e4fa8fffab4f11496de3db28c0c19a1b4423c6ddd0d3388','In-House Team','0000000000','technical_team',NULL,'2026-02-11 11:37:17'),(45,'Sumant','sumant@gmail.com','scrypt:32768:8:1$EzA5jUEuohQcBuut$10f33e5d7e47f9d4b025756cab5ce4326e2cbe1e4a26942fee20f93691388b2b38d0bf424a2029814dc2f72b1a73d08277c038ddd406454d4079a8f18bec6ac4','In-House Team','0000000000','commercial_team',NULL,'2026-02-11 11:38:02'),(46,'ashwini','ashwini@gmail.com','scrypt:32768:8:1$yPEE2bEQzYK8Ph1Y$0674a3923c588dd13e8c953b78f1fbdf7a8602edf572c3379e6d548faf23bda93a0ba3f4141d63cd97aff2e42828ca02c55e10f32cfb725af122f71a67ef7cff','In-House Team','0000000000','verification_team',NULL,'2026-02-11 11:38:41'),(47,'prajwal hr','hr@gmail.com','scrypt:32768:8:1$zWi3HFNFtSXjDj8B$e02dd61b8a3d790eb8d73ee2498ccb990fbfb80288a55fff012b501c150f4abd0f3dd675c2a3f63ce334c00df08708c7708a476af2b6b9777d438f502590e95c','In-House Team','0000000000','hr_team',NULL,'2026-02-11 11:39:12'),(53,'nithesh','nithesh@gmail.com','scrypt:32768:8:1$wpgjZb7ONx9lcslx$4abf4ea4a81c6f369a337500e38046c2f3a79ac8cecac9e5a0d2fb68e4f8dc27780c535d306cd1d21be5d247f55a9d9097839aae4a213cafd967dd844de760a1','In-House Team','0000000000','verification_team',NULL,'2026-02-12 18:12:58'),(56,'Super Admin','admin@gmail.com','scrypt:32768:8:1$jDL76QIX56zEdkii$147a03e59d7986111ce74304de886fa3c432a6950492de545520b52c3fba3e23516998e9bdacdea602b7d052669283efc4d077582ee7a1ea55eb4834aaafa889','Swifterz HQ','0000000000','admin',NULL,'2026-02-16 15:30:24');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_documents`
--

DROP TABLE IF EXISTS `vendor_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vendor_id` int NOT NULL,
  `doc_type` varchar(100) DEFAULT NULL,
  `filename` varchar(255) DEFAULT NULL,
  `file_url` varchar(500) DEFAULT NULL,
  `uploaded_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_documents`
--

LOCK TABLES `vendor_documents` WRITE;
/*!40000 ALTER TABLE `vendor_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `vendor_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_onboarding`
--

DROP TABLE IF EXISTS `vendor_onboarding`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_onboarding` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `trade_license_file` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `country` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `state` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `year_established` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `gst_certificate_file` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `website` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `linkedin` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `contact_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `contact_designation` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `contact_email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `contact_mobile` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `alternate_contact` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `core_business_areas` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `turnover_range` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `num_employees` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `technical_team_size` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sectors` json DEFAULT NULL,
  `service_categories` json DEFAULT NULL,
  `other_sector` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `other_service` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `software_tools` json DEFAULT NULL,
  `other_software` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `certifications` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `nda_agreed` tinyint(1) DEFAULT '0',
  `nda_agreement_file` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `data_protection_compliant` tinyint(1) DEFAULT '0',
  `billing_currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `payment_terms` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `agree_terms` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('pending','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `rejection_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contact_email` (`contact_email`),
  KEY `status` (`status`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_onboarding`
--

LOCK TABLES `vendor_onboarding` WRITE;
/*!40000 ALTER TABLE `vendor_onboarding` DISABLE KEYS */;
/*!40000 ALTER TABLE `vendor_onboarding` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_portfolio`
--

DROP TABLE IF EXISTS `vendor_portfolio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_portfolio` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vendor_id` int NOT NULL,
  `project_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `project_client` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `project_sector` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `project_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `project_role` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `project_tools` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `project_duration` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `project_year` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `project_files` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `vendor_id` (`vendor_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_portfolio`
--

LOCK TABLES `vendor_portfolio` WRITE;
/*!40000 ALTER TABLE `vendor_portfolio` DISABLE KEYS */;
/*!40000 ALTER TABLE `vendor_portfolio` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_ratings`
--

DROP TABLE IF EXISTS `vendor_ratings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_ratings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vendor_id` int NOT NULL,
  `project_id` int DEFAULT NULL,
  `project_name` varchar(255) DEFAULT NULL,
  `rating` int NOT NULL DEFAULT '0',
  `feedback` text,
  `rated_by` int DEFAULT NULL,
  `rated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_ratings`
--

LOCK TABLES `vendor_ratings` WRITE;
/*!40000 ALTER TABLE `vendor_ratings` DISABLE KEYS */;
/*!40000 ALTER TABLE `vendor_ratings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_resource_profiles`
--

DROP TABLE IF EXISTS `vendor_resource_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_resource_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vendor_id` int NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `designation` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `discipline` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `years_of_experience` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `expertise` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `certifications` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `software` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `role` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `profile_picture` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `projects_worked_on` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `login_role` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `vendor_employee_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `vendor_id` (`vendor_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_resource_profiles`
--

LOCK TABLES `vendor_resource_profiles` WRITE;
/*!40000 ALTER TABLE `vendor_resource_profiles` DISABLE KEYS */;
/*!40000 ALTER TABLE `vendor_resource_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_thread_messages`
--

DROP TABLE IF EXISTS `vendor_thread_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_thread_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `thread_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `sender_type` enum('vendor','staff') DEFAULT 'vendor',
  `message` text NOT NULL,
  `attachment_url` varchar(500) DEFAULT NULL,
  `sent_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_thread_messages`
--

LOCK TABLES `vendor_thread_messages` WRITE;
/*!40000 ALTER TABLE `vendor_thread_messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `vendor_thread_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_threads`
--

DROP TABLE IF EXISTS `vendor_threads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_threads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vendor_id` int NOT NULL,
  `context_type` enum('opportunity','proposal','contract','general') DEFAULT 'general',
  `context_id` int DEFAULT NULL,
  `subject` varchar(255) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_threads`
--

LOCK TABLES `vendor_threads` WRITE;
/*!40000 ALTER TABLE `vendor_threads` DISABLE KEYS */;
/*!40000 ALTER TABLE `vendor_threads` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-24 12:23:37
