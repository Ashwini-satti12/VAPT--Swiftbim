-- MySQL dump 10.13  Distrib 8.0.44, for macos15 (arm64)
--
-- Host: 127.0.0.1    Database: snh6_swiftproject
-- ------------------------------------------------------
-- Server version	8.0.44

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
-- Table structure for table `vendor_projects`
--

DROP TABLE IF EXISTS `vendor_projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_projects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_name` varchar(255) DEFAULT NULL,
  `client_id` varchar(255) DEFAULT NULL,
  `description` mediumtext,
  `category` varchar(100) DEFAULT '0',
  `due_date` varchar(255) DEFAULT '',
  `department` varchar(2555) DEFAULT NULL,
  `progress` varchar(12) DEFAULT NULL,
  `document_attachment` varchar(255) DEFAULT NULL,
  `priority` varchar(255) DEFAULT NULL,
  `start_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `members` varchar(255) DEFAULT NULL,
  `budget` varchar(255) DEFAULT '0',
  `budget_ceiling` decimal(15,2) DEFAULT NULL,
  `bidding_end_date` date DEFAULT NULL,
  `location` varchar(255) DEFAULT 'empty',
  `modules` varchar(2555) DEFAULT NULL,
  `no_resource` varchar(255) DEFAULT NULL,
  `no_resources_required` varchar(255) DEFAULT NULL,
  `lead_id` varchar(255) DEFAULT NULL,
  `project_manager_id` varchar(255) DEFAULT NULL,
  `totalhours` varchar(255) DEFAULT NULL,
  `perday` varchar(255) DEFAULT NULL,
  `Company_id` varchar(255) DEFAULT NULL,
  `tasks` varchar(2555) DEFAULT NULL,
  `uploaderid` varchar(255) DEFAULT NULL,
  `payment_status` varchar(255) DEFAULT 'Pending',
  `paid_date` varchar(254) DEFAULT NULL,
  `bim_coordinator_id` varchar(255) DEFAULT NULL,
  `total_paid_amount` decimal(12,2) DEFAULT '0.00',
  `payment_completion_status` enum('NotStarted','InProgress','Completed') DEFAULT 'NotStarted',
  `vendor_id` int DEFAULT NULL,
  `proposal_id` int DEFAULT NULL,
  `opportunity_id` int DEFAULT NULL,
  `deliverables` mediumtext,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_projects`
--

LOCK TABLES `vendor_projects` WRITE;
/*!40000 ALTER TABLE `vendor_projects` DISABLE KEYS */;
INSERT INTO `vendor_projects` VALUES (1,'ARATT - AYATANA RESIDENCES',NULL,'<h2><strong style=\"background-color: rgb(255, 255, 255); color: rgb(2, 2, 2);\">Scope&nbsp;of&nbsp;Work</strong></h2><p></p>','0','',NULL,NULL,NULL,NULL,'2026-03-07 12:24:17',NULL,'0',NULL,NULL,'empty',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Pending',NULL,NULL,0.00,'NotStarted',180,1,4,NULL),
(2,'Client Sumanth-Infrastructure',NULL,'<p>Testing&nbsp;Scope&nbsp;of&nbsp;work</p>','0','',NULL,NULL,NULL,NULL,'2026-03-12 11:10:45',NULL,'0',NULL,NULL,'empty','[\"Testing tech 1\", \"Testing tech 2\"]',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Pending',NULL,NULL,0.00,'NotStarted',2,3,5,'<p>Testing&nbsp;delivery</p>');
/*!40000 ALTER TABLE `vendor_projects` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-13 12:35:32
