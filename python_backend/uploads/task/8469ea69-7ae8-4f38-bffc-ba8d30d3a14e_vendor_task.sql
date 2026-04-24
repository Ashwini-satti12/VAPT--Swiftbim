-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 23, 2026 at 12:17 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `snh6_swiftproject`
--

-- --------------------------------------------------------

--
-- Table structure for table `vendor_task`
--

CREATE TABLE `vendor_task` (
  `id` int(11) NOT NULL,
  `vendor_id` int(11) NOT NULL,
  `project_id` int(11) DEFAULT NULL,
  `task_name` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT '',
  `status` enum('Todo','InProgress','Completed') DEFAULT 'Todo',
  `due_date` date DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `assigned_to` int(11) DEFAULT NULL,
  `modules` varchar(255) DEFAULT '',
  `description` text DEFAULT NULL,
  `checklist` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `outputfilepath` text DEFAULT NULL,
  `progress` varchar(200) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `vendor_task`
--

INSERT INTO `vendor_task` (`id`, `vendor_id`, `project_id`, `task_name`, `category`, `status`, `due_date`, `start_date`, `start_time`, `end_time`, `assigned_to`, `modules`, `description`, `checklist`, `created_at`, `updated_at`, `outputfilepath`, `progress`) VALUES
(3, 2, 2, 'sdf', 'task', 'Completed', '2026-04-11', '2026-03-30', '17:17:00', '19:17:00', 14, '[\"Testing tech 1\"', 'Description', 'Checklist', '2026-03-30 17:17:50', '2026-03-31 21:16:15', 'd3f82296-8b0b-44a4-aafe-c15c9836f6ee_9.BG.svg', NULL),
(5, 10, 2, 'fdvfd', 'task', 'Completed', '2026-03-31', '2026-03-31', '16:38:00', '20:45:00', 6, '[\"Testing tech 1\"', 'd', 'nill', '2026-03-31 15:38:52', '2026-04-08 17:43:18', '57c51ac2-edf6-446e-9e21-e8a8878133ec_snh6_swiftproject_full_correct.sql,78632ccc-f535-436d-bb28-31f8263b22ed_Screenshot2025-12-15034746.png,7b6dd893-be83-40a1-8910-970b78952b66_github.png', NULL),
(7, 11, 4, 'dvdfv', 'Module 1', 'Completed', NULL, NULL, '18:00:00', NULL, 2, '', 'rfrg', 'nill', '2026-03-31 16:00:24', '2026-04-06 16:39:48', NULL, NULL),
(8, 12, 4, 'f', 'task', 'Todo', '2026-03-31', '2026-03-31', '16:22:00', NULL, 5, '[\"Testing tech 1\"', 'dfsd', 'nill', '2026-03-31 16:21:54', '2026-03-31 21:09:34', 'e0d3444b-aa10-4cb8-b6b0-cf7c205884fa_new_swiftbim13.sql', NULL),
(9, 12, 4, 'rrth', 'task', 'Completed', '2026-03-31', '2026-03-31', '17:31:00', '19:31:00', 12, '[\"Testing tech 1\"', 'tgt', 'nill', '2026-03-31 17:32:09', '2026-03-31 21:09:08', 'fe077381-c4dd-4b89-a815-314e1d3e18b7_snh6_swiftproject_full_correct.sql,3feffe26-34f5-4ab5-9528-cd83223b5591_9.BG.svg', NULL),
(10, 2, 4, 'bxs', 'task', 'Completed', '2026-03-31', '2026-03-31', '20:46:00', '22:46:00', 13, '\"Testing tech 2\"]', 'nbb', 'nill', '2026-03-31 20:47:11', '2026-04-06 16:37:20', NULL, NULL),
(12, 145, 42, ' b', 'task', '', '2026-04-03', '2026-04-03', NULL, NULL, 174, 'm1', ' testing', 'nilll', '2026-04-03 17:58:09', '2026-04-03 17:58:09', NULL, NULL),
(13, 99, 30, 'testing', 'task', 'Todo', '2026-04-04', '2026-04-04', '00:00:00', '00:15:00', 99, 'PD - Package1/Package 2/Package 3', 'testing', 'nill', '2026-04-04 17:41:06', '2026-04-04 17:41:06', NULL, NULL),
(14, 99, 30, 'testing', 'task', 'Todo', '2026-04-04', '2026-04-04', '00:00:00', '00:15:00', 99, 'PD - Package1/Package 2/Package 3', 'testing', 'nill', '2026-04-04 17:50:18', '2026-04-04 17:50:18', NULL, NULL),
(15, 99, 3, 'testing', 'task', 'Todo', '2026-04-04', '2026-04-04', '00:05:00', '04:00:00', 99, '[\"Testing tech 1\"', 'testing', 'nill', '2026-04-04 17:55:34', '2026-04-04 17:55:34', NULL, NULL),
(16, 99, 3, 'uuuu', 'task', 'Todo', '2026-04-04', '2026-04-04', '00:10:00', '00:10:00', 99, '[\"Testing tech 1\"', 'hhhhh', 'nill', '2026-04-04 17:56:57', '2026-04-04 17:56:57', NULL, NULL),
(17, 99, 3, 'dd', 'task', 'Todo', '2026-04-04', '2026-04-04', '00:10:00', '08:00:00', 99, '[\"Testing tech 1\"', 'ttttt', 'nill', '2026-04-04 18:55:13', '2026-04-04 18:55:13', NULL, NULL),
(19, 145, 3, 'hhhh', 'task', '', '2026-04-04', '2026-04-04', NULL, NULL, 145, '[\"Testing tech 1\"', 'hhh', 'nill', '2026-04-04 19:36:33', '2026-04-04 19:36:33', NULL, NULL),
(20, 145, 3, 'hhhh', 'task', '', '2026-04-04', '2026-04-04', NULL, NULL, 145, '[\"Testing tech 1\"', 'hhh', 'nill', '2026-04-04 19:36:45', '2026-04-04 19:36:45', NULL, NULL),
(21, 145, 3, 'hhhh', 'task', 'Completed', '2026-04-04', '2026-04-04', NULL, NULL, 145, '[\"Testing tech 1\"', 'hhh', 'nill', '2026-04-04 19:41:31', '2026-04-08 12:06:10', 'e284f16e-b5db-46e3-92e8-9d4a2be14039_new_swiftbim14.sql', NULL),
(22, 145, 3, 'mmm', 'task', 'Completed', '2026-04-04', '2026-04-04', '00:05:00', '00:20:00', 145, '[\"Testing tech 1\"', 'bbb', 'nill', '2026-04-04 19:42:28', '2026-04-07 16:07:18', '2ae668fe-eb87-4a30-9717-825043968155_new_swiftbim13.sql', NULL),
(23, 151, 3, '88', 'task', '', '2026-04-04', '2026-04-04', '00:05:00', '00:15:00', 151, '[\"Testing tech 1\"', 'data:image/svg+xml,%3csvg%20width=\'20\'%20height=\'20\'%20viewBox=\'0%200%2020%2020\'%20fill=\'none\'%20xmlns=\'http://www.w3.org/2000/svg\'%3e%3cpath%20d=\'M2.04567%206.61598C2.28008%206.38164%202.59797%206.25%202.92942%206.25C3.26088%206.25%203.57876%206.38164%203.81317%206.61598L10.0007%2012.8035L16.1882%206.61598C16.4239%206.38829%2016.7397%206.26229%2017.0674%206.26514C17.3952%206.26799%2017.7087%206.39945%2017.9404%206.63121C18.1722%206.86297%2018.3037%207.17649%2018.3065%207.50423C18.3094%207.83198%2018.1834%208.14773%2017.9557%208.38348L10.8844%2015.4547C10.65%2015.6891%2010.3321%2015.8207%2010.0007%2015.8207C9.66922%2015.8207%209.35133%2015.6891%209.11692%2015.4547L2.04567%208.38348C1.81133%208.14907%201.67969%207.83119%201.67969%207.49973C1.67969%207.16828%201.81133%206.85039%202.04567%206.61598Z\'%20fill=\'%23616161\'/%3e%3c/svg%3e', 'nill', '2026-04-04 19:58:21', '2026-04-04 20:05:46', 'e2db3ec7-9aed-4e51-bfd6-af3231186ed2_new_swiftbim13.sql', NULL),
(24, 99, 30, 'iiii', 'task', 'Todo', '2026-04-06', '2026-04-06', '00:00:00', '03:00:00', 165, 'PD - Package1/Package 2/Package 3', 'yyyy', 'nill', '2026-04-06 12:47:05', '2026-04-06 12:47:06', '027fa1e2-2745-40ab-a80e-5d9475698618_team-report-04-04-20266.csv', NULL),
(26, 2, 4, 'hgf', 'task', 'Completed', '2026-04-06', '2026-04-06', '16:31:00', '20:35:00', 11, '[\"Testing tech 1\"', 'ggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg', 'nillll', '2026-04-06 15:32:36', '2026-04-06 16:36:51', 'c8468ef3-ee34-4f5f-b613-6808f4b3715e_team-report-04-04-20263.csv', NULL),
(27, 2, 2, 'hhh', 'task', 'Completed', '2026-04-06', '2026-04-06', '15:34:00', '18:34:00', 5, '[\"Testing tech 1\"', 'tes', 'nill', '2026-04-06 15:34:25', '2026-04-08 17:36:37', '2cf53323-dc39-4198-89e2-32a5599b9b1f_team-report-04-04-20265.csv,c709dc3a-800d-4453-841b-569f2ab44530_Screenshot2025-12-15034746.png', NULL),
(28, 2, 4, 'jjj', 'task', 'InProgress', '2026-04-06', '2026-04-06', '17:47:00', '20:47:00', 11, 'Testing tech 1', 'gggg', 'nill', '2026-04-06 15:48:09', '2026-04-08 12:06:11', '83c9e47d-fcd9-4209-bc0b-dfdbdddd92a4_team-report-04-04-20265.csv,e002da7d-91a2-4fd5-a7e4-f911402a4d3c_team-report-04-04-20265.csv,c8d385cd-28c5-4ca9-bced-98fab47509e2_team-report-04-04-20265.csv,35902881-c181-48a2-8281-954c365e8cb1_9.BG.svg', NULL),
(29, 11, 12, 'tt', 'task', 'Todo', '2026-04-08', '2026-04-08', '18:11:00', NULL, 14, 'Module 2', 'rg', 'nill', '2026-04-08 16:11:36', '2026-04-08 16:11:36', NULL, NULL),
(30, 11, 4, 'uuu', 'Medium', 'Todo', '2026-04-08', '2026-04-08', '16:16:00', NULL, 2, 'Module 1', 'hhhh', 'nill', '2026-04-08 16:14:42', '2026-04-08 16:14:42', NULL, NULL),
(31, 11, 12, 'ttt', 'task', 'Todo', '2026-04-08', '2026-04-08', '18:18:00', NULL, 11, 'Module 1', 'ggggggggggggggggg', 'nill', '2026-04-08 16:18:44', '2026-04-08 17:09:16', '6ad3de23-71fd-470f-b487-d5be54520828_Screenshot2025-12-15033640.png', NULL),
(32, 10, 4, 'hhhhhhhhhhhhhhh', 'task', 'Todo', '2026-04-08', '2026-04-08', '18:45:00', '21:45:00', 10, '[\"Testing tech 1\"', 'yhghhgh', '', '2026-04-08 17:46:25', '2026-04-08 17:51:53', 'afe495af-9a2b-43fc-9d9e-682d997d789a_Screenshot2025-12-15034746.png', NULL),
(33, 10, 4, 'jj', 'task', 'Todo', '2026-04-15', '2026-04-15', '16:19:00', '19:19:00', 11, '[\"Testing tech 1\"', 'ghg', 'nill', '2026-04-09 15:19:57', '2026-04-15 16:53:59', 'edeb0034-6992-460f-b2b6-a2d5a11ce208_new_swiftbim16.sql,2662813d-7541-4982-9820-855f25f2c433_new_swiftbim17.sql', NULL),
(34, 10, 4, 'ggfhgf', 'task', 'Todo', '2026-04-15', '2026-04-15', '17:03:00', '19:02:00', 11, '[\"Testing tech 1\"', 'ghggv', '', '2026-04-15 17:05:58', '2026-04-15 17:05:58', NULL, NULL),
(35, 10, 2, 'iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii', 'task', 'Todo', '2026-04-15', '2026-04-15', '17:06:00', '19:06:00', 15, '\"Testing tech 2\"]', 'ggggggg', '', '2026-04-15 17:06:40', '2026-04-15 17:07:10', NULL, NULL),
(36, 10, 4, 'efdfgdf', 'task', 'Todo', '2026-04-15', '2026-04-15', '17:14:00', '21:14:00', 11, '[\"Testing tech 1\"', 'bvgb ', 'nill', '2026-04-15 17:14:42', '2026-04-15 17:15:21', 'e35fcd13-1083-48f6-96f6-f42a4f60a3ba_Screenshot2025-12-15033640.png', NULL),
(37, 99, 30, 'fgbhfgb', 'task', 'Todo', '2026-04-15', '2026-04-15', '00:01:00', '00:03:00', 165, 'PD - Package1/Package 2/Package 3', 'cgbfb', '', '2026-04-15 17:29:23', '2026-04-15 17:29:23', NULL, NULL),
(38, 165, 30, 'fbgb', 'task', 'Todo', '2026-04-15', '2026-04-15', '00:02:00', '00:03:00', 165, 'PD - Package1/Package 2/Package 3', 'ffg', '', '2026-04-15 17:34:42', '2026-04-15 17:34:42', NULL, NULL),
(39, 99, 30, 'vnhnhn', 'task', 'Todo', '2026-04-15', '2026-04-15', '00:02:00', '00:04:00', 165, 'PD - Package1/Package 2/Package 3', 'nghnh', '', '2026-04-15 17:35:35', '2026-04-15 17:35:35', NULL, NULL),
(40, 165, 30, 'gbfgbggh', 'task', 'Todo', '2026-04-15', '2026-04-15', '00:02:00', '00:04:00', 165, 'PD - Package1/Package 2/Package 3', 'gfbg', '', '2026-04-15 17:39:19', '2026-04-15 17:39:19', NULL, NULL),
(41, 165, 30, 'ashwini', 'task', 'Todo', '2026-04-15', '2026-04-15', '00:03:00', '00:02:00', 151, 'PD - Package1/Package 2/Package 3', 'gfhgh', '', '2026-04-15 17:40:03', '2026-04-15 17:40:03', NULL, NULL),
(42, 165, 30, '======', 'task', 'Todo', '2026-04-15', '2026-04-15', '00:01:00', '00:05:00', 165, 'PD - Package1/Package 2/Package 3', 'jghg', '', '2026-04-15 17:43:34', '2026-04-15 17:43:34', NULL, NULL),
(43, 165, 30, '7777777777', 'task', 'Todo', '2026-04-15', '2026-04-15', '00:01:00', '00:02:00', 165, 'PD - Package1/Package 2/Package 3', 'hghghf', '', '2026-04-15 17:45:17', '2026-04-15 17:45:17', NULL, NULL),
(44, 165, 30, '9999', 'task', 'Todo', '2026-04-15', '2026-04-15', '00:01:00', '00:02:00', 151, 'PD - Package1/Package 2/Package 3', 'testing', '', '2026-04-15 17:48:53', '2026-04-15 17:48:53', NULL, NULL),
(45, 99, 30, 'mko', 'task', 'Todo', '2026-04-15', '2026-04-15', '00:02:00', '00:03:00', 151, 'PD - Package1/Package 2/Package 3', 'fdgfb', 'nill', '2026-04-15 17:50:37', '2026-04-15 17:50:37', NULL, NULL),
(46, 99, 30, 'bottle', 'task', 'Todo', '2026-04-15', '2026-04-15', '00:01:00', '00:02:00', 99, 'PD - Package1/Package 2/Package 3', 'bfgbf', '', '2026-04-15 17:55:50', '2026-04-15 17:55:50', NULL, NULL),
(47, 99, 30, 'tgrth', 'task', 'Todo', '2026-04-15', '2026-04-15', '00:03:00', '00:03:00', 165, 'DD - Package1/Package 2/Package 3', 'gbg', '', '2026-04-15 17:58:42', '2026-04-15 17:58:42', NULL, NULL),
(48, 99, 30, 'achhuu', 'task', 'Todo', '2026-04-15', '2026-04-15', '00:02:00', '05:00:00', 99, 'PD - Package1/Package 2/Package 3', 'dcvd', '', '2026-04-15 18:07:58', '2026-04-15 18:07:58', NULL, NULL),
(49, 12, 4, 'bb', 'task', 'Todo', '2026-04-15', '2026-04-15', '19:11:00', '22:11:00', 11, '[\"Testing tech 1\"', 'gbgb', '', '2026-04-15 18:11:34', '2026-04-15 18:11:34', NULL, NULL),
(50, 99, 30, 'asharani', 'task', 'Todo', '2026-04-15', '2026-04-15', '00:02:00', '00:03:00', 151, 'PD - Package1/Package 2/Package 3', 'bghn', '', '2026-04-15 18:13:16', '2026-04-15 18:13:16', NULL, NULL),
(51, 10, 4, 'oooooooo', 'task', 'Todo', '2026-04-15', '2026-04-15', '18:24:00', '21:24:00', 11, '[\"Testing tech 1\"', 'hh', '', '2026-04-15 18:24:39', '2026-04-15 18:24:39', NULL, NULL),
(52, 11, 2, 'ggg', 'task', 'Todo', '2026-04-15', '2026-04-15', '19:28:00', NULL, 11, 'Module 2', 'dvf', '', '2026-04-15 18:29:10', '2026-04-15 18:29:10', NULL, NULL),
(53, 10, 2, 'you do work', 'task', 'Todo', '2026-04-15', '2026-04-15', '18:29:00', '20:29:00', 0, 'task', 'bghgh', '', '2026-04-15 18:30:15', '2026-04-20 13:33:45', NULL, NULL),
(54, 165, 30, 'ffff', 'task', 'Todo', '2026-04-16', '2026-04-16', '00:01:00', '00:02:00', 165, 'PD - Package1/Package 2/Package 3', 'fff', '', '2026-04-16 12:47:47', '2026-04-16 12:47:47', NULL, NULL),
(55, 165, 30, 'yyyyy', 'task', 'Todo', '2026-04-16', '2026-04-16', '00:01:00', '00:03:00', 165, 'PD - Package1/Package 2/Package 3', 'bhfh', '', '2026-04-16 12:56:59', '2026-04-16 12:56:59', NULL, NULL),
(56, 165, 30, 'fvdfv', 'task', 'Todo', '2026-04-16', '2026-04-16', '00:01:00', '00:07:00', 165, 'PD - Package1/Package 2/Package 3', 'dfvfgb', '', '2026-04-16 12:57:41', '2026-04-16 12:57:41', NULL, NULL),
(57, 10, 4, 'iii', 'task', 'Todo', '2026-04-17', '2026-04-17', '14:40:00', '16:41:00', 11, '[\"Testing tech 1\"', 'testing', '', '2026-04-17 13:41:15', '2026-04-17 13:41:15', NULL, NULL),
(58, 103, 4, 'test', 'task', '', '2026-04-20', '2026-04-20', '02:00:00', NULL, 103, '[\"Testing tech 1\"', 'testing', '', '2026-04-20 12:12:03', '2026-04-20 12:12:03', NULL, NULL),
(59, 99, 30, 'test1', 'task', 'Todo', '2026-04-20', '2026-04-20', '02:00:00', '04:00:00', 151, 'PD - Package1/Package 2/Package 3', 'testingg', '', '2026-04-20 12:19:20', '2026-04-20 12:19:20', NULL, NULL),
(60, 145, 4, 'te', '', 'Todo', '2026-04-20', '2026-04-20', '00:02:00', NULL, 99, '[\"Testing tech 1\"', 'tttt', '', '2026-04-20 12:59:20', '2026-04-20 12:59:20', NULL, NULL),
(61, 165, 30, 'jj', 'task', 'Todo', '2026-04-20', '2026-04-20', '02:00:00', '04:00:00', 151, 'PD - Package1/Package 2/Package 3', 'testing', '', '2026-04-20 13:09:42', '2026-04-20 13:09:42', NULL, NULL),
(62, 2, 2, 'uuu', 'task', 'Completed', '2026-04-20', '2026-04-20', '14:15:00', '15:15:00', 11, '[\"Testing tech 1\"', 'testing', '', '2026-04-20 13:15:59', '2026-04-20 13:29:56', NULL, '95'),
(63, 2, 4, '65', 'task', 'Completed', '2026-04-20', '2026-04-20', '14:18:00', '17:18:00', 11, '[\"Testing tech 1\"', 'tr', '', '2026-04-20 13:18:30', '2026-04-20 13:29:08', NULL, '95'),
(64, 12, 4, 'tes', 'task', 'Todo', '2026-04-20', '2026-04-20', '14:31:00', '16:31:00', 11, '\"Testing tech 2\"]', 'test', '', '2026-04-20 13:31:31', '2026-04-20 13:31:31', NULL, NULL),
(65, 12, 4, 'tes', 'task', 'Todo', '2026-04-20', '2026-04-20', '14:31:00', '16:31:00', 11, '\"Testing tech 2\"]', 'test', '', '2026-04-20 13:31:32', '2026-04-20 13:31:32', NULL, NULL),
(66, 12, 4, 'tes', 'task', 'Todo', '2026-04-20', '2026-04-20', '14:31:00', '16:31:00', 11, '\"Testing tech 2\"]', 'test', '', '2026-04-20 13:31:37', '2026-04-20 13:31:37', NULL, NULL),
(67, 12, 4, 'testinggggg123', 'task', 'Todo', '2026-04-20', '2026-04-20', '14:32:00', '16:32:00', 11, '[\"Testing tech 1\"', 'tesssssssssssssssss', '', '2026-04-20 13:32:42', '2026-04-20 13:32:42', NULL, NULL),
(68, 12, 4, 'testinggggg123', 'task', 'InProgress', '2026-04-20', '2026-04-20', '14:32:00', '16:32:00', 11, '[\"Testing tech 1\"', 'tesssssssssssssssssyyyy', '', '2026-04-20 13:32:46', '2026-04-20 13:35:04', NULL, '50'),
(69, 99, 30, 'test678', 'task', 'Todo', '2026-04-20', '2026-04-20', '00:01:00', '04:00:00', 151, 'PD - Package1/Package 2/Package 3', 'test', '', '2026-04-20 15:48:31', '2026-04-20 15:48:31', NULL, NULL),
(70, 99, 30, 'test6', 'task', 'Todo', '2026-04-20', '2026-04-20', '02:00:00', '04:00:00', 151, 'PD - Package1/Package 2/Package 3', 'test', '', '2026-04-20 15:49:30', '2026-04-20 15:49:30', NULL, NULL),
(71, 99, 30, 'test5', 'task', 'Todo', '2026-04-20', '2026-04-20', '00:01:00', '05:00:00', 165, 'PD - Package1/Package 2/Package 3', 'test', '', '2026-04-20 15:52:02', '2026-04-20 15:52:02', NULL, NULL),
(72, 99, 30, 'test00', 'task', 'Todo', '2026-04-20', '2026-04-20', '03:00:00', '05:00:00', 165, 'PD - Package1/Package 2/Package 3', 'test', '', '2026-04-20 15:54:22', '2026-04-20 15:54:22', NULL, NULL),
(73, 99, 30, 'test6', 'task', 'Todo', '2026-04-20', '2026-04-20', '00:02:00', '00:03:00', 165, 'PD - Package1/Package 2/Package 3', 'test', '', '2026-04-20 15:56:39', '2026-04-20 15:56:39', NULL, NULL),
(74, 99, 30, 'testex1', 'task', 'Todo', '2026-04-20', '2026-04-20', '00:02:00', '00:03:00', 151, 'PD - Package1/Package 2/Package 3', 'test', '', '2026-04-20 16:22:33', '2026-04-20 16:22:33', NULL, NULL),
(75, 99, 30, 'test567', 'task', 'Todo', '2026-04-20', '2026-04-20', '00:03:00', '05:00:00', 151, 'PD - Package1/Package 2/Package 3', 'test', '', '2026-04-20 16:37:34', '2026-04-20 16:37:34', NULL, NULL),
(76, 145, 4, 'test', '', 'Todo', '2026-04-20', '2026-04-20', '03:00:00', NULL, 145, '[\"Testing tech 1\"', 'testing', '', '2026-04-20 17:39:57', '2026-04-20 17:39:57', NULL, NULL),
(77, 99, 30, 'taskAB', 'task', 'Todo', '2026-04-21', '2026-04-21', '00:01:00', '04:00:00', 99, 'DD - Package1/Package 2/Package 3', 'test', '', '2026-04-21 12:37:36', '2026-04-21 12:37:36', NULL, NULL),
(78, 145, 4, 'testA', '', 'Todo', '2026-04-21', '2026-04-21', '00:02:00', NULL, 99, '[\"Testing tech 1\"', 'test', '', '2026-04-21 15:54:38', '2026-04-21 15:54:38', NULL, NULL),
(79, 99, 30, 'ta', 'task', 'Todo', '2026-04-21', '2026-04-21', '00:02:00', '05:00:00', 99, 'PD - Package1/Package 2/Package 3', 'test', '', '2026-04-21 16:08:10', '2026-04-21 16:08:10', NULL, NULL),
(80, 99, 30, 'test4', 'task', 'Todo', '2026-04-21', '2026-04-21', '00:04:00', '05:00:00', 99, 'PD - Package1/Package 2/Package 3', 'test', '', '2026-04-21 16:24:30', '2026-04-21 16:24:30', NULL, NULL),
(81, 99, 30, 'test3', 'task', 'Todo', '2026-04-21', '2026-04-21', '04:00:00', '08:00:00', 99, 'PD - Package1/Package 2/Package 3', 'test', '', '2026-04-21 16:27:19', '2026-04-21 16:27:19', NULL, NULL),
(82, 99, 30, 'testASHU', 'task', 'Todo', '2026-04-21', '2026-04-21', '04:00:00', '08:00:00', 99, 'PD - Package1/Package 2/Package 3', 'test', '', '2026-04-21 16:29:20', '2026-04-21 16:29:20', NULL, NULL),
(83, 99, 30, 'testP', 'task', 'Todo', '2026-04-21', '2026-04-21', '00:02:00', '10:00:00', 99, 'DD - Package1/Package 2/Package 3', 'test', '', '2026-04-21 16:37:48', '2026-04-21 16:37:48', NULL, NULL),
(84, 99, 30, 'Ash1', 'task', 'Todo', '2026-04-21', '2026-04-21', '00:02:00', '00:03:00', 99, 'DD - Package1/Package 2/Package 3', 'testing', '', '2026-04-21 16:43:27', '2026-04-21 16:43:27', NULL, NULL),
(85, 99, 30, 'yyy', 'task', 'Todo', '2026-04-21', '2026-04-21', '00:01:00', '04:00:00', 99, 'DD - Package1/Package 2/Package 3', 'testttt', '', '2026-04-21 16:50:26', '2026-04-21 16:50:26', NULL, NULL),
(86, 99, 30, 'test012', 'task', 'Todo', '2026-04-21', '2026-04-21', '00:02:00', '05:00:00', 99, 'PD - Package1/Package 2/Package 3', 'testing', '', '2026-04-21 16:56:11', '2026-04-21 16:56:11', NULL, NULL),
(87, 99, 30, 'testm', 'task', 'Todo', '2026-04-21', '2026-04-21', '00:03:00', '00:03:00', 151, 'PD - Package1/Package 2/Package 3', 'test', '', '2026-04-21 17:04:55', '2026-04-21 17:04:55', NULL, NULL),
(88, 103, 4, 'task', 'task', '', '2026-04-21', '2026-04-21', '00:02:00', NULL, 145, '[\"Testing tech 1\"', 'test', '', '2026-04-21 18:17:06', '2026-04-21 18:17:06', NULL, NULL),
(89, 103, 4, 'task1287', 'bug', '', '2026-04-21', '2026-04-21', '03:00:00', NULL, 145, '[\"Testing tech 1\"', 'testing', '', '2026-04-21 18:21:05', '2026-04-21 18:21:05', NULL, NULL),
(90, 99, 30, 'test123', 'task', 'Todo', '2026-04-22', '2026-04-22', '00:03:00', '04:00:00', 151, 'PD - Package1/Package 2/Package 3', 'test', '', '2026-04-22 11:17:36', '2026-04-22 11:17:36', NULL, NULL),
(91, 2, 2, 'task1', 'task', 'Completed', '2026-04-22', '2026-04-22', '15:00:00', '16:00:00', 11, '[\"Testing tech 1\"', 'task', '', '2026-04-22 12:00:24', '2026-04-22 12:00:54', NULL, '95'),
(92, 99, 30, 'taskA', 'task', 'Todo', '2026-04-22', '2026-04-22', '00:00:00', '00:02:00', 99, 'PD - Package1/Package 2/Package 3', 'TASKS', '', '2026-04-22 16:47:28', '2026-04-22 16:47:28', NULL, NULL),
(93, 99, 30, 'taskJ', 'task', 'Todo', '2026-04-22', '2026-04-22', '00:03:00', '00:03:00', 99, 'DD - Package1/Package 2/Package 3', 'tasks', '', '2026-04-22 16:48:11', '2026-04-22 16:48:11', NULL, NULL),
(94, 99, 30, 'tasks5', 'task', 'Todo', '2026-04-23', '2026-04-23', '00:04:00', '00:04:00', 99, 'DD - Package1/Package 2/Package 3', 'tasks', '', '2026-04-23 11:56:15', '2026-04-23 11:56:15', NULL, NULL),
(95, 99, 30, 'tasksl', 'task', 'Todo', '2026-04-23', '2026-04-23', '00:03:00', '00:04:00', 99, 'PD - Package1/Package 2/Package 3', 'testing', '', '2026-04-23 12:33:23', '2026-04-23 12:33:23', NULL, NULL),
(96, 99, 30, 'taskFF', 'task', 'Todo', '2026-04-23', '2026-04-23', '00:04:00', '00:03:00', 99, 'DD - Package1/Package 2/Package 3', 'TASKS', '', '2026-04-23 12:39:21', '2026-04-23 12:39:21', NULL, NULL),
(97, 145, 41, 'tasks6540', '', 'Todo', '2026-04-23', '2026-04-23', '00:02:00', '00:04:00', 145, 'm1', 'tasks', '', '2026-04-23 12:59:39', '2026-04-23 13:25:11', NULL, NULL),
(98, 103, 4, 'tasksB', 'bug', '', '2026-04-23', '2026-04-23', '00:02:00', NULL, 103, '[\"Testing tech 1\"', 'tasks', '', '2026-04-23 13:11:22', '2026-04-23 13:11:22', NULL, NULL),
(99, 145, 41, 'tas', '', 'Todo', '2026-04-23', '2026-04-23', '00:02:00', NULL, 145, 'm1', 'tasks', '', '2026-04-23 13:26:00', '2026-04-23 13:26:00', NULL, NULL),
(100, 99, 30, 'TA', 'task', 'Todo', '2026-04-23', '2026-04-23', '00:02:00', '00:04:00', 99, 'PD - Package1/Package 2/Package 3', 'tasks', '', '2026-04-23 13:40:38', '2026-04-23 13:40:38', NULL, NULL),
(101, 145, 41, 'tasksppp', '', 'Todo', '2026-04-23', '2026-04-23', '00:03:00', NULL, 99, 'm1', 'tasks', '', '2026-04-23 13:42:42', '2026-04-23 13:42:42', NULL, NULL),
(102, 99, 30, 'tASK', 'task', 'Todo', '2026-04-30', '2026-04-30', '00:02:00', '00:04:00', 99, 'PD - Package1/Package 2/Package 3', 'tasks', '', '2026-04-23 13:44:48', '2026-04-23 13:44:48', NULL, NULL),
(103, 145, 41, 'tasks', '', 'Todo', '2026-04-23', '2026-04-23', '00:02:00', NULL, 145, 'm1', 'tasks', '', '2026-04-23 13:45:41', '2026-04-23 13:45:41', NULL, NULL),
(104, 145, 41, 'TASK6', '', 'Todo', '2026-04-23', '2026-04-23', '00:02:00', NULL, 145, 'm2', 'tasks', '', '2026-04-23 13:48:37', '2026-04-23 13:48:37', NULL, NULL),
(105, 99, 30, 'TASH', 'task', 'Todo', '2026-04-23', '2026-04-23', '00:02:00', '00:03:00', 99, 'PD - Package1/Package 2/Package 3', 'tasks', '', '2026-04-23 13:50:13', '2026-04-23 13:50:13', NULL, NULL),
(106, 99, 30, 'T', 'task', 'Todo', '2026-04-23', '2026-04-23', '00:02:00', '00:04:00', 99, 'DD - Package1/Package 2/Package 3', 'tasks', '', '2026-04-23 15:15:47', '2026-04-23 15:15:47', NULL, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `vendor_task`
--
ALTER TABLE `vendor_task`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `vendor_task`
--
ALTER TABLE `vendor_task`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=107;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
