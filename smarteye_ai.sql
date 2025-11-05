/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-12.0.2-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: smarteye_ai
-- ------------------------------------------------------
-- Server version	12.0.2-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `alert_logs`
--

DROP TABLE IF EXISTS `alert_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `alert_logs` (
  `alert_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `threshold_id` int(11) NOT NULL,
  `camera_id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `current_occupancy` int(11) NOT NULL,
  `max_occupancy` int(11) NOT NULL,
  `alert_time` datetime DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `status` enum('triggered','resolved') DEFAULT 'triggered',
  PRIMARY KEY (`alert_id`),
  KEY `idx_tenant_alerts` (`tenant_id`,`alert_time`),
  KEY `idx_camera_alerts` (`camera_id`,`alert_time`),
  KEY `idx_status` (`status`),
  KEY `threshold_id` (`threshold_id`),
  CONSTRAINT `alert_logs_ibfk_88` FOREIGN KEY (`threshold_id`) REFERENCES `alert_thresholds` (`threshold_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `alert_logs_ibfk_89` FOREIGN KEY (`camera_id`) REFERENCES `cameras` (`camera_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `alert_logs_ibfk_90` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alert_logs`
--

LOCK TABLES `alert_logs` WRITE;
/*!40000 ALTER TABLE `alert_logs` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `alert_logs` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `alert_thresholds`
--

DROP TABLE IF EXISTS `alert_thresholds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `alert_thresholds` (
  `threshold_id` int(11) NOT NULL AUTO_INCREMENT,
  `camera_id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `max_occupancy` int(11) NOT NULL,
  `alert_enabled` tinyint(1) DEFAULT 1,
  `notification_email` varchar(500) DEFAULT NULL COMMENT 'Comma-separated emails',
  `notification_webhook` varchar(500) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`threshold_id`),
  UNIQUE KEY `unique_camera_threshold` (`camera_id`,`zone_id`),
  KEY `idx_tenant_threshold` (`tenant_id`),
  KEY `zone_id` (`zone_id`),
  CONSTRAINT `alert_thresholds_ibfk_88` FOREIGN KEY (`camera_id`) REFERENCES `cameras` (`camera_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `alert_thresholds_ibfk_89` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `alert_thresholds_ibfk_90` FOREIGN KEY (`zone_id`) REFERENCES `zone_config` (`zone_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alert_thresholds`
--

LOCK TABLES `alert_thresholds` WRITE;
/*!40000 ALTER TABLE `alert_thresholds` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `alert_thresholds` VALUES
(1,2,1,NULL,30,1,'thendralraji@gmail.com',NULL,'2025-10-30 16:35:02','2025-10-30 16:35:02');
/*!40000 ALTER TABLE `alert_thresholds` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `branches`
--

DROP TABLE IF EXISTS `branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `branches` (
  `branch_id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `branch_name` varchar(255) NOT NULL,
  `branch_code` varchar(50) NOT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `timezone` varchar(50) DEFAULT 'UTC',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`branch_id`),
  UNIQUE KEY `unique_branch_code` (`tenant_id`,`branch_code`),
  KEY `idx_tenant_branch` (`tenant_id`,`branch_id`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `branches_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branches`
--

LOCK TABLES `branches` WRITE;
/*!40000 ALTER TABLE `branches` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `branches` VALUES
(1,1,'Main Store','BRANCH001',NULL,'Chennai',NULL,'India','UTC',1,NULL,NULL),
(2,1,'Branch2','BRANCH002','123 Main Street Marapalam','Erode','Tamil Nadu','India','UTC',1,'2025-10-27 05:57:03','2025-10-27 05:57:03');
/*!40000 ALTER TABLE `branches` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `cameras`
--

DROP TABLE IF EXISTS `cameras`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cameras` (
  `camera_id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `camera_name` varchar(255) NOT NULL,
  `camera_code` varchar(50) NOT NULL,
  `camera_type` enum('IP','USB','RTSP','DVR','NVR') DEFAULT 'IP',
  `stream_url` varchar(500) DEFAULT NULL,
  `location_description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `fps` int(11) DEFAULT 25,
  `resolution` varchar(20) DEFAULT '1920x1080',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`camera_id`),
  UNIQUE KEY `unique_camera_code` (`tenant_id`,`camera_code`),
  KEY `idx_tenant_camera` (`tenant_id`,`camera_id`),
  KEY `idx_branch_camera` (`branch_id`,`camera_id`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `cameras_ibfk_59` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `cameras_ibfk_60` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cameras`
--

LOCK TABLES `cameras` WRITE;
/*!40000 ALTER TABLE `cameras` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `cameras` VALUES
(1,1,2,'Main Entrance','CAM001','IP','rtsp://admin:admin@192.168.1.100:554/live/ch00_0','Front Entrance',1,26,'2048x1536','2025-10-28 12:22:47','2025-10-28 12:22:47'),
(2,1,1,'Back Camera','CAM002','IP','rtsp://admin:admin@192.168.1.100:554/live/ch00_1','Back Camera',1,27,'2560x1440','2025-10-29 05:06:25','2025-10-29 05:06:25'),
(3,1,2,'Side Door','Camera003','IP','rtsp://admin:admin@192.168.1.100:554/live/ch00_2','Side Door',1,25,'1280x720','2025-10-29 05:07:15','2025-10-29 05:07:15');
/*!40000 ALTER TABLE `cameras` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `current_occupancy`
--

DROP TABLE IF EXISTS `current_occupancy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `current_occupancy` (
  `occupancy_id` int(11) NOT NULL AUTO_INCREMENT,
  `camera_id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `current_count` int(11) DEFAULT 0,
  `total_entries` int(11) DEFAULT 0,
  `total_exits` int(11) DEFAULT 0,
  `last_updated` datetime DEFAULT NULL,
  `reset_at` datetime DEFAULT NULL COMMENT 'Last reset time (daily/manual)',
  PRIMARY KEY (`occupancy_id`),
  UNIQUE KEY `unique_camera_occupancy` (`camera_id`,`zone_id`),
  KEY `idx_tenant_occupancy` (`tenant_id`),
  KEY `idx_branch_occupancy` (`branch_id`),
  KEY `zone_id` (`zone_id`),
  CONSTRAINT `current_occupancy_ibfk_117` FOREIGN KEY (`camera_id`) REFERENCES `cameras` (`camera_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `current_occupancy_ibfk_118` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `current_occupancy_ibfk_119` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `current_occupancy_ibfk_120` FOREIGN KEY (`zone_id`) REFERENCES `zone_config` (`zone_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `current_occupancy`
--

LOCK TABLES `current_occupancy` WRITE;
/*!40000 ALTER TABLE `current_occupancy` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `current_occupancy` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `detection_accuracy`
--

DROP TABLE IF EXISTS `detection_accuracy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `detection_accuracy` (
  `accuracy_id` int(11) NOT NULL AUTO_INCREMENT,
  `camera_id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `total_detections` int(11) DEFAULT 0,
  `successful_detections` int(11) DEFAULT 0,
  `failed_detections` int(11) DEFAULT 0,
  `accuracy_percentage` decimal(5,2) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`accuracy_id`),
  UNIQUE KEY `unique_camera_date` (`camera_id`,`date`),
  KEY `idx_tenant_accuracy` (`tenant_id`,`date`),
  CONSTRAINT `detection_accuracy_ibfk_59` FOREIGN KEY (`camera_id`) REFERENCES `cameras` (`camera_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `detection_accuracy_ibfk_60` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detection_accuracy`
--

LOCK TABLES `detection_accuracy` WRITE;
/*!40000 ALTER TABLE `detection_accuracy` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `detection_accuracy` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `people_count_logs`
--

DROP TABLE IF EXISTS `people_count_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `people_count_logs` (
  `log_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `camera_id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `zone_id` int(11) DEFAULT NULL,
  `person_id` varchar(100) DEFAULT NULL COMMENT 'Tracking ID from DeepSORT/ByteTrack',
  `direction` enum('IN','OUT') NOT NULL,
  `detection_time` datetime NOT NULL,
  `frame_number` int(11) DEFAULT NULL,
  `confidence_score` decimal(5,4) DEFAULT NULL COMMENT 'Detection confidence (0-1)',
  `image_path` varchar(500) DEFAULT NULL COMMENT 'Path to stored snapshot',
  `thumbnail_path` varchar(500) DEFAULT NULL COMMENT 'Path to thumbnail image',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional detection metadata' CHECK (json_valid(`metadata`)),
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`log_id`),
  KEY `idx_camera_time` (`camera_id`,`detection_time`),
  KEY `idx_tenant_time` (`tenant_id`,`detection_time`),
  KEY `idx_branch_time` (`branch_id`,`detection_time`),
  KEY `idx_direction` (`direction`),
  KEY `idx_person_tracking` (`person_id`,`detection_time`),
  KEY `idx_logs_camera_direction_time` (`camera_id`,`direction`,`detection_time`),
  KEY `idx_logs_tenant_branch_time` (`tenant_id`,`branch_id`,`detection_time`),
  KEY `zone_id` (`zone_id`),
  CONSTRAINT `people_count_logs_ibfk_117` FOREIGN KEY (`camera_id`) REFERENCES `cameras` (`camera_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `people_count_logs_ibfk_118` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `people_count_logs_ibfk_119` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `people_count_logs_ibfk_120` FOREIGN KEY (`zone_id`) REFERENCES `zone_config` (`zone_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=864 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `people_count_logs`
--

LOCK TABLES `people_count_logs` WRITE;
/*!40000 ALTER TABLE `people_count_logs` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `people_count_logs` VALUES
(808,1,1,2,NULL,'person_1cface19','IN','2025-11-01 06:35:16',0,0.8603,NULL,NULL,'{\"bbox\":{\"x\":437,\"y\":768,\"width\":135,\"height\":241},\"tracking_id\":\"track_0\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(809,1,1,2,NULL,'person_1026acf1','OUT','2025-11-01 06:35:19',30,0.8679,NULL,NULL,'{\"bbox\":{\"x\":198,\"y\":197,\"width\":81,\"height\":211},\"tracking_id\":\"track_1\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(810,1,1,2,NULL,'person_fdb6de90','IN','2025-11-01 06:35:22',60,0.9733,NULL,NULL,'{\"bbox\":{\"x\":471,\"y\":208,\"width\":122,\"height\":109},\"tracking_id\":\"track_2\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(811,1,1,2,NULL,'person_1231209b','IN','2025-11-01 06:35:25',90,0.9289,NULL,NULL,'{\"bbox\":{\"x\":399,\"y\":648,\"width\":127,\"height\":245},\"tracking_id\":\"track_3\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(812,1,1,2,NULL,'person_b52d4006','OUT','2025-11-01 06:35:28',120,0.9597,NULL,NULL,'{\"bbox\":{\"x\":937,\"y\":770,\"width\":77,\"height\":170},\"tracking_id\":\"track_4\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(813,1,1,2,NULL,'person_c4cb5ab6','IN','2025-11-01 06:35:31',150,0.9829,NULL,NULL,'{\"bbox\":{\"x\":693,\"y\":438,\"width\":102,\"height\":112},\"tracking_id\":\"track_5\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(814,1,1,2,NULL,'person_7e7e3f7a','IN','2025-11-01 06:35:34',180,0.8992,NULL,NULL,'{\"bbox\":{\"x\":501,\"y\":285,\"width\":148,\"height\":118},\"tracking_id\":\"track_6\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(815,1,1,2,NULL,'person_0ab831d6','OUT','2025-11-01 06:35:37',210,0.9738,NULL,NULL,'{\"bbox\":{\"x\":908,\"y\":227,\"width\":58,\"height\":180},\"tracking_id\":\"track_7\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(816,1,1,2,NULL,'person_f1ddaf42','OUT','2025-11-01 06:35:40',240,0.9577,NULL,NULL,'{\"bbox\":{\"x\":758,\"y\":721,\"width\":58,\"height\":146},\"tracking_id\":\"track_8\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(817,1,1,2,NULL,'person_c81ec4d9','OUT','2025-11-01 06:35:43',270,0.8708,NULL,NULL,'{\"bbox\":{\"x\":190,\"y\":509,\"width\":135,\"height\":219},\"tracking_id\":\"track_9\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(818,1,1,2,NULL,'person_87a98291','OUT','2025-11-01 06:35:46',300,0.9071,NULL,NULL,'{\"bbox\":{\"x\":191,\"y\":765,\"width\":103,\"height\":157},\"tracking_id\":\"track_10\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(819,1,1,2,NULL,'person_8e323a04','IN','2025-11-01 06:35:49',330,0.9041,NULL,NULL,'{\"bbox\":{\"x\":564,\"y\":650,\"width\":73,\"height\":207},\"tracking_id\":\"track_11\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(820,1,1,2,NULL,'person_7dbaf9c5','IN','2025-11-01 06:35:52',360,0.9116,NULL,NULL,'{\"bbox\":{\"x\":789,\"y\":647,\"width\":135,\"height\":241},\"tracking_id\":\"track_12\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(821,1,1,2,NULL,'person_a0a945da','IN','2025-11-01 06:35:55',390,0.8506,NULL,NULL,'{\"bbox\":{\"x\":291,\"y\":231,\"width\":110,\"height\":145},\"tracking_id\":\"track_13\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(822,1,1,2,NULL,'person_c0a5da36','OUT','2025-11-01 06:35:58',420,0.8693,NULL,NULL,'{\"bbox\":{\"x\":696,\"y\":191,\"width\":137,\"height\":144},\"tracking_id\":\"track_14\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(823,1,1,2,NULL,'person_ec144d36','IN','2025-11-01 06:36:01',450,0.8594,NULL,NULL,'{\"bbox\":{\"x\":32,\"y\":471,\"width\":62,\"height\":113},\"tracking_id\":\"track_15\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(824,1,1,2,NULL,'person_81bc167c','IN','2025-11-01 06:36:04',480,0.9824,NULL,NULL,'{\"bbox\":{\"x\":305,\"y\":529,\"width\":60,\"height\":103},\"tracking_id\":\"track_16\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(825,1,1,2,NULL,'person_18d9106f','OUT','2025-11-01 06:36:07',510,0.9568,NULL,NULL,'{\"bbox\":{\"x\":543,\"y\":731,\"width\":96,\"height\":229},\"tracking_id\":\"track_17\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(826,1,1,2,NULL,'person_a06e5362','IN','2025-11-01 06:36:10',540,0.9938,NULL,NULL,'{\"bbox\":{\"x\":89,\"y\":558,\"width\":121,\"height\":221},\"tracking_id\":\"track_18\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(827,1,1,2,NULL,'person_6c7234d8','IN','2025-11-01 06:36:13',570,0.9419,NULL,NULL,'{\"bbox\":{\"x\":87,\"y\":693,\"width\":51,\"height\":109},\"tracking_id\":\"track_19\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(828,1,1,2,NULL,'person_aaaf77d6','IN','2025-11-01 06:36:16',600,0.9406,NULL,NULL,'{\"bbox\":{\"x\":557,\"y\":721,\"width\":61,\"height\":181},\"tracking_id\":\"track_20\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(829,1,1,2,NULL,'person_d1ee0512','IN','2025-11-01 06:36:19',630,0.9644,NULL,NULL,'{\"bbox\":{\"x\":34,\"y\":520,\"width\":146,\"height\":124},\"tracking_id\":\"track_21\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(830,1,1,2,NULL,'person_9617d874','IN','2025-11-01 06:36:22',660,0.9306,NULL,NULL,'{\"bbox\":{\"x\":660,\"y\":526,\"width\":102,\"height\":210},\"tracking_id\":\"track_22\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(831,1,1,2,NULL,'person_bf33e69f','OUT','2025-11-01 06:36:25',690,0.8995,NULL,NULL,'{\"bbox\":{\"x\":834,\"y\":724,\"width\":53,\"height\":166},\"tracking_id\":\"track_23\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(832,1,1,2,NULL,'person_b7e8c179','IN','2025-11-01 06:36:28',720,0.9144,NULL,NULL,'{\"bbox\":{\"x\":999,\"y\":171,\"width\":91,\"height\":154},\"tracking_id\":\"track_24\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(833,1,1,2,NULL,'person_11b0ceeb','IN','2025-11-01 06:36:31',750,0.9028,NULL,NULL,'{\"bbox\":{\"x\":139,\"y\":267,\"width\":52,\"height\":152},\"tracking_id\":\"track_25\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(834,1,1,2,NULL,'person_757f88e0','IN','2025-11-01 06:36:34',780,0.8586,NULL,NULL,'{\"bbox\":{\"x\":498,\"y\":560,\"width\":83,\"height\":125},\"tracking_id\":\"track_26\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(835,1,1,2,NULL,'person_119ee41a','IN','2025-11-01 06:36:37',810,0.9911,NULL,NULL,'{\"bbox\":{\"x\":831,\"y\":93,\"width\":118,\"height\":115},\"tracking_id\":\"track_27\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(836,1,1,2,NULL,'person_8f447bbd','IN','2025-11-01 06:36:40',840,0.8542,NULL,NULL,'{\"bbox\":{\"x\":252,\"y\":151,\"width\":118,\"height\":187},\"tracking_id\":\"track_28\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(837,1,1,2,NULL,'person_80e68b1d','OUT','2025-11-01 06:36:43',870,0.8619,NULL,NULL,'{\"bbox\":{\"x\":647,\"y\":671,\"width\":79,\"height\":229},\"tracking_id\":\"track_29\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(838,1,1,2,NULL,'person_37fa42f9','OUT','2025-11-01 06:36:46',900,0.9205,NULL,NULL,'{\"bbox\":{\"x\":441,\"y\":39,\"width\":81,\"height\":178},\"tracking_id\":\"track_30\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(839,1,1,2,NULL,'person_f9606bac','OUT','2025-11-01 06:36:49',930,0.8976,NULL,NULL,'{\"bbox\":{\"x\":71,\"y\":262,\"width\":93,\"height\":155},\"tracking_id\":\"track_31\",\"model_version\":\"yolov8_v1.0_simulated\",\"job_id\":\"b73377e4-c19c-4d7d-979f-8b707957920e\",\"source\":\"upload_analysis\"}','2025-11-01 06:35:20'),
(840,2,1,1,NULL,'person_0','IN','2025-11-01 09:45:26',0,0.9135,NULL,NULL,'{\"bbox\":{\"x\":100,\"y\":311,\"width\":73,\"height\":185},\"tracking_id\":\"track_0\",\"model_version\":\"simulation_v2_accurate\",\"confidence\":0.914,\"is_accurate_count\":true,\"actual_entries\":8,\"actual_exits\":0,\"job_id\":\"b88507f3-ca8e-42ca-967c-977e28ec1720\",\"source\":\"upload_analysis\"}','2025-11-01 09:45:26'),
(841,2,1,1,NULL,'person_1','IN','2025-11-01 09:45:29',225,0.9033,NULL,NULL,'{\"bbox\":{\"x\":344,\"y\":350,\"width\":81,\"height\":186},\"tracking_id\":\"track_1\",\"model_version\":\"simulation_v2_accurate\",\"confidence\":0.9112,\"is_accurate_count\":true,\"actual_entries\":8,\"actual_exits\":0,\"job_id\":\"b88507f3-ca8e-42ca-967c-977e28ec1720\",\"source\":\"upload_analysis\"}','2025-11-01 09:45:26'),
(842,2,1,1,NULL,'person_2','IN','2025-11-01 09:45:33',450,0.8820,NULL,NULL,'{\"bbox\":{\"x\":596,\"y\":131,\"width\":87,\"height\":123},\"tracking_id\":\"track_2\",\"model_version\":\"simulation_v2_accurate\",\"confidence\":0.8557,\"is_accurate_count\":true,\"actual_entries\":8,\"actual_exits\":0,\"job_id\":\"b88507f3-ca8e-42ca-967c-977e28ec1720\",\"source\":\"upload_analysis\"}','2025-11-01 09:45:26'),
(843,2,1,1,NULL,'person_3','IN','2025-11-01 09:45:37',675,0.8661,NULL,NULL,'{\"bbox\":{\"x\":440,\"y\":277,\"width\":52,\"height\":114},\"tracking_id\":\"track_3\",\"model_version\":\"simulation_v2_accurate\",\"confidence\":0.8979,\"is_accurate_count\":true,\"actual_entries\":8,\"actual_exits\":0,\"job_id\":\"b88507f3-ca8e-42ca-967c-977e28ec1720\",\"source\":\"upload_analysis\"}','2025-11-01 09:45:26'),
(844,2,1,1,NULL,'person_4','IN','2025-11-01 09:45:41',900,0.8971,NULL,NULL,'{\"bbox\":{\"x\":528,\"y\":225,\"width\":47,\"height\":168},\"tracking_id\":\"track_4\",\"model_version\":\"simulation_v2_accurate\",\"confidence\":0.8711,\"is_accurate_count\":true,\"actual_entries\":8,\"actual_exits\":0,\"job_id\":\"b88507f3-ca8e-42ca-967c-977e28ec1720\",\"source\":\"upload_analysis\"}','2025-11-01 09:45:26'),
(845,2,1,1,NULL,'person_5','IN','2025-11-01 09:45:44',1125,0.9021,NULL,NULL,'{\"bbox\":{\"x\":586,\"y\":263,\"width\":85,\"height\":99},\"tracking_id\":\"track_5\",\"model_version\":\"simulation_v2_accurate\",\"confidence\":0.8998,\"is_accurate_count\":true,\"actual_entries\":8,\"actual_exits\":0,\"job_id\":\"b88507f3-ca8e-42ca-967c-977e28ec1720\",\"source\":\"upload_analysis\"}','2025-11-01 09:45:26'),
(846,2,1,1,NULL,'person_6','IN','2025-11-01 09:45:48',1350,0.9045,NULL,NULL,'{\"bbox\":{\"x\":233,\"y\":364,\"width\":90,\"height\":82},\"tracking_id\":\"track_6\",\"model_version\":\"simulation_v2_accurate\",\"confidence\":0.8988,\"is_accurate_count\":true,\"actual_entries\":8,\"actual_exits\":0,\"job_id\":\"b88507f3-ca8e-42ca-967c-977e28ec1720\",\"source\":\"upload_analysis\"}','2025-11-01 09:45:26'),
(847,2,1,1,NULL,'person_7','IN','2025-11-01 09:45:52',1575,0.8857,NULL,NULL,'{\"bbox\":{\"x\":276,\"y\":139,\"width\":97,\"height\":192},\"tracking_id\":\"track_7\",\"model_version\":\"simulation_v2_accurate\",\"confidence\":0.8766,\"is_accurate_count\":true,\"actual_entries\":8,\"actual_exits\":0,\"job_id\":\"b88507f3-ca8e-42ca-967c-977e28ec1720\",\"source\":\"upload_analysis\"}','2025-11-01 09:45:26'),
(848,2,1,1,NULL,'person_0','IN','2025-11-01 10:43:16',0,0.9141,NULL,NULL,'{\"bbox\":{\"x\":579,\"y\":352,\"width\":91,\"height\":142},\"tracking_id\":\"track_0\",\"model_version\":\"simulation_v2_accurate\",\"confidence\":0.9401,\"is_accurate_count\":true,\"actual_entries\":8,\"actual_exits\":0,\"video_duration\":14.056739807128906,\"processing_complete\":true,\"job_id\":\"f7701838-b6b7-484c-b27c-c623f189dc17\",\"source\":\"upload_analysis\"}','2025-11-01 10:43:17'),
(849,2,1,1,NULL,'person_1','IN','2025-11-01 10:43:18',52,0.8887,NULL,NULL,'{\"bbox\":{\"x\":219,\"y\":344,\"width\":70,\"height\":178},\"tracking_id\":\"track_1\",\"model_version\":\"simulation_v2_accurate\",\"confidence\":0.9366,\"is_accurate_count\":true,\"actual_entries\":8,\"actual_exits\":0,\"video_duration\":14.056739807128906,\"processing_complete\":true,\"job_id\":\"f7701838-b6b7-484c-b27c-c623f189dc17\",\"source\":\"upload_analysis\"}','2025-11-01 10:43:17'),
(850,2,1,1,NULL,'person_2','IN','2025-11-01 10:43:20',105,0.8715,NULL,NULL,'{\"bbox\":{\"x\":340,\"y\":325,\"width\":71,\"height\":160},\"tracking_id\":\"track_2\",\"model_version\":\"simulation_v2_accurate\",\"confidence\":0.875,\"is_accurate_count\":true,\"actual_entries\":8,\"actual_exits\":0,\"video_duration\":14.056739807128906,\"processing_complete\":true,\"job_id\":\"f7701838-b6b7-484c-b27c-c623f189dc17\",\"source\":\"upload_analysis\"}','2025-11-01 10:43:17'),
(851,2,1,1,NULL,'person_3','IN','2025-11-01 10:43:22',158,0.8643,NULL,NULL,'{\"bbox\":{\"x\":102,\"y\":111,\"width\":53,\"height\":113},\"tracking_id\":\"track_3\",\"model_version\":\"simulation_v2_accurate\",\"confidence\":0.9488,\"is_accurate_count\":true,\"actual_entries\":8,\"actual_exits\":0,\"video_duration\":14.056739807128906,\"processing_complete\":true,\"job_id\":\"f7701838-b6b7-484c-b27c-c623f189dc17\",\"source\":\"upload_analysis\"}','2025-11-01 10:43:17'),
(852,2,1,1,NULL,'person_4','IN','2025-11-01 10:43:23',210,0.9110,NULL,NULL,'{\"bbox\":{\"x\":578,\"y\":108,\"width\":48,\"height\":95},\"tracking_id\":\"track_4\",\"model_version\":\"simulation_v2_accurate\",\"confidence\":0.9472,\"is_accurate_count\":true,\"actual_entries\":8,\"actual_exits\":0,\"video_duration\":14.056739807128906,\"processing_complete\":true,\"job_id\":\"f7701838-b6b7-484c-b27c-c623f189dc17\",\"source\":\"upload_analysis\"}','2025-11-01 10:43:17'),
(853,2,1,1,NULL,'person_5','IN','2025-11-01 10:43:25',263,0.8566,NULL,NULL,'{\"bbox\":{\"x\":403,\"y\":115,\"width\":64,\"height\":100},\"tracking_id\":\"track_5\",\"model_version\":\"simulation_v2_accurate\",\"confidence\":0.8513,\"is_accurate_count\":true,\"actual_entries\":8,\"actual_exits\":0,\"video_duration\":14.056739807128906,\"processing_complete\":true,\"job_id\":\"f7701838-b6b7-484c-b27c-c623f189dc17\",\"source\":\"upload_analysis\"}','2025-11-01 10:43:17'),
(854,2,1,1,NULL,'person_6','IN','2025-11-01 10:43:27',316,0.9463,NULL,NULL,'{\"bbox\":{\"x\":449,\"y\":350,\"width\":63,\"height\":107},\"tracking_id\":\"track_6\",\"model_version\":\"simulation_v2_accurate\",\"confidence\":0.9087,\"is_accurate_count\":true,\"actual_entries\":8,\"actual_exits\":0,\"video_duration\":14.056739807128906,\"processing_complete\":true,\"job_id\":\"f7701838-b6b7-484c-b27c-c623f189dc17\",\"source\":\"upload_analysis\"}','2025-11-01 10:43:17'),
(855,2,1,1,NULL,'person_7','IN','2025-11-01 10:43:29',368,0.8978,NULL,NULL,'{\"bbox\":{\"x\":286,\"y\":317,\"width\":105,\"height\":160},\"tracking_id\":\"track_7\",\"model_version\":\"simulation_v2_accurate\",\"confidence\":0.946,\"is_accurate_count\":true,\"actual_entries\":8,\"actual_exits\":0,\"video_duration\":14.056739807128906,\"processing_complete\":true,\"job_id\":\"f7701838-b6b7-484c-b27c-c623f189dc17\",\"source\":\"upload_analysis\"}','2025-11-01 10:43:17'),
(856,2,1,1,NULL,'person_0','IN','2025-11-01 17:04:28',0,0.9262,NULL,NULL,'{\"bbox\":{\"x\":519,\"y\":278,\"width\":45,\"height\":151},\"tracking_id\":\"track_0\",\"model_version\":\"simulation_v2_accurate\",\"confidence\":0.9284,\"is_accurate_count\":true,\"actual_entries\":8,\"actual_exits\":0,\"video_duration\":11.983478546142578,\"processing_complete\":true,\"job_id\":\"61654e80-d00c-4c21-8874-be64757d9e11\",\"source\":\"upload_analysis\"}','2025-11-01 17:04:28'),
(857,2,1,1,NULL,'person_1','IN','2025-11-01 17:04:30',44,0.9373,NULL,NULL,'{\"bbox\":{\"x\":481,\"y\":215,\"width\":53,\"height\":86},\"tracking_id\":\"track_1\",\"model_version\":\"simulation_v2_accurate\",\"confidence\":0.8834,\"is_accurate_count\":true,\"actual_entries\":8,\"actual_exits\":0,\"video_duration\":11.983478546142578,\"processing_complete\":true,\"job_id\":\"61654e80-d00c-4c21-8874-be64757d9e11\",\"source\":\"upload_analysis\"}','2025-11-01 17:04:28'),
(858,2,1,1,NULL,'person_2','IN','2025-11-01 17:04:31',89,0.8665,NULL,NULL,'{\"bbox\":{\"x\":208,\"y\":290,\"width\":102,\"height\":167},\"tracking_id\":\"track_2\",\"model_version\":\"simulation_v2_accurate\",\"confidence\":0.9249,\"is_accurate_count\":true,\"actual_entries\":8,\"actual_exits\":0,\"video_duration\":11.983478546142578,\"processing_complete\":true,\"job_id\":\"61654e80-d00c-4c21-8874-be64757d9e11\",\"source\":\"upload_analysis\"}','2025-11-01 17:04:28'),
(859,2,1,1,NULL,'person_3','IN','2025-11-01 17:04:33',134,0.9184,NULL,NULL,'{\"bbox\":{\"x\":350,\"y\":276,\"width\":91,\"height\":93},\"tracking_id\":\"track_3\",\"model_version\":\"simulation_v2_accurate\",\"confidence\":0.9135,\"is_accurate_count\":true,\"actual_entries\":8,\"actual_exits\":0,\"video_duration\":11.983478546142578,\"processing_complete\":true,\"job_id\":\"61654e80-d00c-4c21-8874-be64757d9e11\",\"source\":\"upload_analysis\"}','2025-11-01 17:04:28'),
(860,2,1,1,NULL,'person_4','IN','2025-11-01 17:04:34',179,0.8831,NULL,NULL,'{\"bbox\":{\"x\":347,\"y\":160,\"width\":115,\"height\":96},\"tracking_id\":\"track_4\",\"model_version\":\"simulation_v2_accurate\",\"confidence\":0.9426,\"is_accurate_count\":true,\"actual_entries\":8,\"actual_exits\":0,\"video_duration\":11.983478546142578,\"processing_complete\":true,\"job_id\":\"61654e80-d00c-4c21-8874-be64757d9e11\",\"source\":\"upload_analysis\"}','2025-11-01 17:04:28'),
(861,2,1,1,NULL,'person_5','IN','2025-11-01 17:04:36',224,0.9031,NULL,NULL,'{\"bbox\":{\"x\":190,\"y\":259,\"width\":72,\"height\":144},\"tracking_id\":\"track_5\",\"model_version\":\"simulation_v2_accurate\",\"confidence\":0.8561,\"is_accurate_count\":true,\"actual_entries\":8,\"actual_exits\":0,\"video_duration\":11.983478546142578,\"processing_complete\":true,\"job_id\":\"61654e80-d00c-4c21-8874-be64757d9e11\",\"source\":\"upload_analysis\"}','2025-11-01 17:04:28'),
(862,2,1,1,NULL,'person_6','IN','2025-11-01 17:04:37',269,0.8810,NULL,NULL,'{\"bbox\":{\"x\":396,\"y\":288,\"width\":94,\"height\":174},\"tracking_id\":\"track_6\",\"model_version\":\"simulation_v2_accurate\",\"confidence\":0.8973,\"is_accurate_count\":true,\"actual_entries\":8,\"actual_exits\":0,\"video_duration\":11.983478546142578,\"processing_complete\":true,\"job_id\":\"61654e80-d00c-4c21-8874-be64757d9e11\",\"source\":\"upload_analysis\"}','2025-11-01 17:04:28'),
(863,2,1,1,NULL,'person_7','IN','2025-11-01 17:04:39',314,0.8653,NULL,NULL,'{\"bbox\":{\"x\":376,\"y\":209,\"width\":96,\"height\":197},\"tracking_id\":\"track_7\",\"model_version\":\"simulation_v2_accurate\",\"confidence\":0.9172,\"is_accurate_count\":true,\"actual_entries\":8,\"actual_exits\":0,\"video_duration\":11.983478546142578,\"processing_complete\":true,\"job_id\":\"61654e80-d00c-4c21-8874-be64757d9e11\",\"source\":\"upload_analysis\"}','2025-11-01 17:04:28');
/*!40000 ALTER TABLE `people_count_logs` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `plugin_jobs`
--

DROP TABLE IF EXISTS `plugin_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `plugin_jobs` (
  `job_id` varchar(100) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `camera_id` int(11) DEFAULT NULL,
  `plugin_type` varchar(50) NOT NULL DEFAULT 'people_counting',
  `input_type` enum('video','image','stream') NOT NULL,
  `input_path` varchar(500) DEFAULT NULL,
  `status` enum('pending','processing','completed','failed') DEFAULT 'pending',
  `result_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Detection results summary' CHECK (json_valid(`result_json`)),
  `error_message` text DEFAULT NULL,
  `total_detections` int(11) DEFAULT 0,
  `processing_time_seconds` int(11) DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`job_id`),
  KEY `idx_tenant_jobs` (`tenant_id`,`created_at`),
  KEY `idx_status` (`status`),
  KEY `idx_plugin_type` (`plugin_type`),
  KEY `user_id` (`user_id`),
  KEY `camera_id` (`camera_id`),
  CONSTRAINT `plugin_jobs_ibfk_88` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `plugin_jobs_ibfk_89` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `plugin_jobs_ibfk_90` FOREIGN KEY (`camera_id`) REFERENCES `cameras` (`camera_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plugin_jobs`
--

LOCK TABLES `plugin_jobs` WRITE;
/*!40000 ALTER TABLE `plugin_jobs` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `plugin_jobs` VALUES
('2c444bbf-a0b8-4048-b1f2-5e0bb0cd970b',1,1,3,'people_counting','stream','https://v.ftcdn.net/02/01/53/99/700_F_201539930_hTPwbs8u3lkEWVn5EPCJThj5EidSKg2s_ST.mp4','completed','{\"entries\":14,\"exits\":0,\"totalDetections\":44,\"netCount\":14,\"avgConfidence\":0.85,\"detectionsByDirection\":{\"IN\":14,\"OUT\":0},\"lastUpdate\":\"2025-11-01T10:46:30.471Z\"}',NULL,44,NULL,'2025-11-01 10:44:33','2025-11-01 10:46:33','2025-11-01 10:44:33'),
('3669d937-89a5-48ed-ba94-45d95854a224',1,1,1,'people_counting','stream','https://v.ftcdn.net/02/01/53/44/700_F_201534462_i04jFtKhk810eTSELiou50zUH1cFxSyW_ST.mp4','completed','{\"entries\":3,\"exits\":0,\"totalDetections\":12,\"netCount\":3,\"avgConfidence\":0.85,\"detectionsByDirection\":{\"IN\":3,\"OUT\":0},\"lastUpdate\":\"2025-11-01T10:42:02.813Z\"}',NULL,12,NULL,'2025-11-01 10:41:26','2025-11-01 10:42:03','2025-11-01 10:41:26'),
('44e0bbaf-6b89-4f07-9ca8-c544f012259d',1,1,3,'people_counting','stream','https://v.ftcdn.net/06/68/85/37/700_F_668853714_wwRiwI6smZUXHATdU2YIex1Kua30TSJ2_ST.mp4','completed','{\"entries\":4,\"exits\":0,\"totalDetections\":9,\"netCount\":4,\"avgConfidence\":0.85,\"detectionsByDirection\":{\"IN\":4,\"OUT\":0},\"lastUpdate\":\"2025-11-01T10:24:17.832Z\"}',NULL,9,NULL,'2025-11-01 10:23:56','2025-11-01 10:24:19','2025-11-01 10:23:56'),
('61654e80-d00c-4c21-8874-be64757d9e11',1,1,2,'people_counting','video','D:\\Web APP\\Smarteye\\backend\\uploads\\videos\\vid_2f6dd375-4b5f-45c9-8a7f-c1eba5fda33e.mp4','completed','{\"totalDetections\":8,\"entries\":8,\"exits\":0,\"netCount\":8,\"avgConfidence\":0.8976,\"detectionsByDirection\":{\"IN\":8,\"OUT\":0},\"timeline\":[{\"time\":\"17:04:28\",\"entries\":1,\"exits\":0},{\"time\":\"17:04:30\",\"entries\":1,\"exits\":0},{\"time\":\"17:04:31\",\"entries\":1,\"exits\":0},{\"time\":\"17:04:33\",\"entries\":1,\"exits\":0},{\"time\":\"17:04:34\",\"entries\":1,\"exits\":0},{\"time\":\"17:04:36\",\"entries\":1,\"exits\":0},{\"time\":\"17:04:37\",\"entries\":1,\"exits\":0},{\"time\":\"17:04:39\",\"entries\":1,\"exits\":0}],\"confidenceRange\":{\"min\":0.8653,\"max\":0.9373}}',NULL,8,0,'2025-11-01 17:04:28','2025-11-01 17:04:28','2025-11-01 17:04:28'),
('ae10d35d-cd8d-4a25-9be3-041c2003dc5a',1,1,2,'people_counting','stream','https://v.ftcdn.net/06/68/85/37/700_F_668853714_wwRiwI6smZUXHATdU2YIex1Kua30TSJ2_ST.mp4','processing','{\"entries\":9,\"exits\":0,\"totalDetections\":30,\"netCount\":9,\"avgConfidence\":0.85,\"detectionsByDirection\":{\"IN\":9,\"OUT\":0},\"lastUpdate\":\"2025-11-01T10:10:54.891Z\"}',NULL,30,NULL,'2025-11-01 10:09:12',NULL,'2025-11-01 10:09:12'),
('b73377e4-c19c-4d7d-979f-8b707957920e',1,1,1,'people_counting','video','D:\\Web APP\\smarteye-ai-people-counting\\backend\\uploads\\videos\\vid_0d27599f-0f94-4ba3-868a-aa0186873a33.mp4','completed','{\"totalDetections\":32,\"entries\":20,\"exits\":12,\"netCount\":8,\"avgConfidence\":0.9184,\"detectionsByDirection\":{\"IN\":20,\"OUT\":12},\"timeline\":[{\"time\":\"06:35:16\",\"entries\":1,\"exits\":0},{\"time\":\"06:35:19\",\"entries\":0,\"exits\":1},{\"time\":\"06:35:22\",\"entries\":1,\"exits\":0},{\"time\":\"06:35:25\",\"entries\":1,\"exits\":0},{\"time\":\"06:35:28\",\"entries\":0,\"exits\":1},{\"time\":\"06:35:31\",\"entries\":1,\"exits\":0},{\"time\":\"06:35:34\",\"entries\":1,\"exits\":0},{\"time\":\"06:35:37\",\"entries\":0,\"exits\":1},{\"time\":\"06:35:40\",\"entries\":0,\"exits\":1},{\"time\":\"06:35:43\",\"entries\":0,\"exits\":1},{\"time\":\"06:35:46\",\"entries\":0,\"exits\":1},{\"time\":\"06:35:49\",\"entries\":1,\"exits\":0},{\"time\":\"06:35:52\",\"entries\":1,\"exits\":0},{\"time\":\"06:35:55\",\"entries\":1,\"exits\":0},{\"time\":\"06:35:58\",\"entries\":0,\"exits\":1},{\"time\":\"06:36:01\",\"entries\":1,\"exits\":0},{\"time\":\"06:36:04\",\"entries\":1,\"exits\":0},{\"time\":\"06:36:07\",\"entries\":0,\"exits\":1},{\"time\":\"06:36:10\",\"entries\":1,\"exits\":0},{\"time\":\"06:36:13\",\"entries\":1,\"exits\":0},{\"time\":\"06:36:16\",\"entries\":1,\"exits\":0},{\"time\":\"06:36:19\",\"entries\":1,\"exits\":0},{\"time\":\"06:36:22\",\"entries\":1,\"exits\":0},{\"time\":\"06:36:25\",\"entries\":0,\"exits\":1},{\"time\":\"06:36:28\",\"entries\":1,\"exits\":0},{\"time\":\"06:36:31\",\"entries\":1,\"exits\":0},{\"time\":\"06:36:34\",\"entries\":1,\"exits\":0},{\"time\":\"06:36:37\",\"entries\":1,\"exits\":0},{\"time\":\"06:36:40\",\"entries\":1,\"exits\":0},{\"time\":\"06:36:43\",\"entries\":0,\"exits\":1},{\"time\":\"06:36:46\",\"entries\":0,\"exits\":1},{\"time\":\"06:36:49\",\"entries\":0,\"exits\":1}],\"confidenceRange\":{\"min\":0.8506,\"max\":0.9938}}',NULL,32,3,'2025-11-01 06:35:16','2025-11-01 06:35:20','2025-11-01 06:35:16'),
('b88507f3-ca8e-42ca-967c-977e28ec1720',1,1,2,'people_counting','video','D:\\Web APP\\smarteye-ai-people-counting\\backend\\uploads\\videos\\vid_b9bf8b6d-1e17-4490-bcf5-c7b3679efebb.mp4','completed','{\"totalDetections\":8,\"entries\":8,\"exits\":0,\"netCount\":8,\"avgConfidence\":0.8943,\"detectionsByDirection\":{\"IN\":8,\"OUT\":0},\"timeline\":[{\"time\":\"09:45:26\",\"entries\":1,\"exits\":0},{\"time\":\"09:45:29\",\"entries\":1,\"exits\":0},{\"time\":\"09:45:33\",\"entries\":1,\"exits\":0},{\"time\":\"09:45:37\",\"entries\":1,\"exits\":0},{\"time\":\"09:45:41\",\"entries\":1,\"exits\":0},{\"time\":\"09:45:44\",\"entries\":1,\"exits\":0},{\"time\":\"09:45:48\",\"entries\":1,\"exits\":0},{\"time\":\"09:45:52\",\"entries\":1,\"exits\":0}],\"confidenceRange\":{\"min\":0.8661,\"max\":0.9135}}',NULL,8,0,'2025-11-01 09:45:26','2025-11-01 09:45:26','2025-11-01 09:45:25'),
('bfb75876-2474-4d66-8356-248935f9e58b',1,1,3,'people_counting','stream','https://v.ftcdn.net/06/68/85/37/700_F_668853714_wwRiwI6smZUXHATdU2YIex1Kua30TSJ2_ST.mp4','completed','{\"entries\":3,\"exits\":0,\"totalDetections\":7,\"netCount\":3,\"avgConfidence\":0.85,\"detectionsByDirection\":{\"IN\":3,\"OUT\":0},\"lastUpdate\":\"2025-11-01T10:25:24.574Z\"}',NULL,7,NULL,'2025-11-01 10:25:06','2025-11-01 10:25:27','2025-11-01 10:25:06'),
('defb690c-d7e4-4ba7-aad7-38a3700be891',1,1,2,'people_counting','video','D:\\Web APP\\smarteye-ai-people-counting\\backend\\uploads\\videos\\vid_f18b23d0-45aa-4dcf-8776-6a9e0e545c51.mp4','failed',NULL,'AI process failed with code 1: ',0,NULL,'2025-11-01 09:40:55','2025-11-01 09:40:56','2025-11-01 09:40:55'),
('df42c130-6a1c-4192-90a9-1635b23a3243',1,1,2,'people_counting','stream','https://v.ftcdn.net/06/68/85/37/700_F_668853714_wwRiwI6smZUXHATdU2YIex1Kua30TSJ2_ST.mp4','completed','{\"entries\":5,\"exits\":0,\"totalDetections\":16,\"netCount\":5,\"avgConfidence\":0.85,\"detectionsByDirection\":{\"IN\":5,\"OUT\":0},\"lastUpdate\":\"2025-11-01T10:38:12.169Z\"}',NULL,16,NULL,'2025-11-01 10:37:33','2025-11-01 10:38:12','2025-11-01 10:37:33'),
('f2ea8bbf-e031-4f39-b32b-cfc75943d425',1,1,2,'people_counting','stream','https://v.ftcdn.net/06/68/85/37/700_F_668853714_wwRiwI6smZUXHATdU2YIex1Kua30TSJ2_ST.mp4','completed','{\"entries\":4,\"exits\":0,\"totalDetections\":11,\"netCount\":4,\"avgConfidence\":0.85,\"detectionsByDirection\":{\"IN\":4,\"OUT\":0},\"lastUpdate\":\"2025-11-01T10:15:49.710Z\"}',NULL,11,NULL,'2025-11-01 10:15:19','2025-11-01 10:15:51','2025-11-01 10:15:19'),
('f7701838-b6b7-484c-b27c-c623f189dc17',1,1,2,'people_counting','video','D:\\Web APP\\smarteye-ai-people-counting\\backend\\uploads\\videos\\vid_265b9fe1-b206-46b1-a233-e85c713c5665.mp4','completed','{\"totalDetections\":8,\"entries\":8,\"exits\":0,\"netCount\":8,\"avgConfidence\":0.8938,\"detectionsByDirection\":{\"IN\":8,\"OUT\":0},\"timeline\":[{\"time\":\"10:43:16\",\"entries\":1,\"exits\":0},{\"time\":\"10:43:18\",\"entries\":1,\"exits\":0},{\"time\":\"10:43:20\",\"entries\":1,\"exits\":0},{\"time\":\"10:43:22\",\"entries\":1,\"exits\":0},{\"time\":\"10:43:23\",\"entries\":1,\"exits\":0},{\"time\":\"10:43:25\",\"entries\":1,\"exits\":0},{\"time\":\"10:43:27\",\"entries\":1,\"exits\":0},{\"time\":\"10:43:29\",\"entries\":1,\"exits\":0}],\"confidenceRange\":{\"min\":0.8566,\"max\":0.9463}}',NULL,8,0,'2025-11-01 10:43:16','2025-11-01 10:43:17','2025-11-01 10:43:16');
/*!40000 ALTER TABLE `plugin_jobs` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `tenants`
--

DROP TABLE IF EXISTS `tenants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenants` (
  `tenant_id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_name` varchar(255) NOT NULL,
  `tenant_code` varchar(50) NOT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `subscription_type` enum('basic','premium','enterprise') DEFAULT 'basic',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`tenant_id`),
  UNIQUE KEY `tenant_code` (`tenant_code`),
  UNIQUE KEY `tenant_code_2` (`tenant_code`),
  UNIQUE KEY `tenant_code_3` (`tenant_code`),
  UNIQUE KEY `tenant_code_4` (`tenant_code`),
  UNIQUE KEY `tenant_code_5` (`tenant_code`),
  UNIQUE KEY `tenant_code_6` (`tenant_code`),
  UNIQUE KEY `tenant_code_7` (`tenant_code`),
  UNIQUE KEY `tenant_code_8` (`tenant_code`),
  UNIQUE KEY `tenant_code_9` (`tenant_code`),
  UNIQUE KEY `tenant_code_10` (`tenant_code`),
  UNIQUE KEY `tenant_code_11` (`tenant_code`),
  UNIQUE KEY `tenant_code_12` (`tenant_code`),
  UNIQUE KEY `tenant_code_13` (`tenant_code`),
  UNIQUE KEY `tenant_code_14` (`tenant_code`),
  UNIQUE KEY `tenant_code_15` (`tenant_code`),
  UNIQUE KEY `tenant_code_16` (`tenant_code`),
  UNIQUE KEY `tenant_code_17` (`tenant_code`),
  UNIQUE KEY `tenant_code_18` (`tenant_code`),
  UNIQUE KEY `tenant_code_19` (`tenant_code`),
  UNIQUE KEY `tenant_code_20` (`tenant_code`),
  UNIQUE KEY `tenant_code_21` (`tenant_code`),
  UNIQUE KEY `tenant_code_22` (`tenant_code`),
  UNIQUE KEY `tenant_code_23` (`tenant_code`),
  UNIQUE KEY `tenant_code_24` (`tenant_code`),
  UNIQUE KEY `tenant_code_25` (`tenant_code`),
  UNIQUE KEY `tenant_code_26` (`tenant_code`),
  UNIQUE KEY `tenant_code_27` (`tenant_code`),
  UNIQUE KEY `tenant_code_28` (`tenant_code`),
  UNIQUE KEY `tenant_code_29` (`tenant_code`),
  UNIQUE KEY `tenant_code_30` (`tenant_code`),
  UNIQUE KEY `tenant_code_31` (`tenant_code`),
  UNIQUE KEY `tenant_code_32` (`tenant_code`),
  UNIQUE KEY `tenant_code_33` (`tenant_code`),
  UNIQUE KEY `tenant_code_34` (`tenant_code`),
  UNIQUE KEY `tenant_code_35` (`tenant_code`),
  UNIQUE KEY `tenant_code_36` (`tenant_code`),
  UNIQUE KEY `tenant_code_37` (`tenant_code`),
  UNIQUE KEY `tenant_code_38` (`tenant_code`),
  UNIQUE KEY `tenant_code_39` (`tenant_code`),
  UNIQUE KEY `tenant_code_40` (`tenant_code`),
  UNIQUE KEY `tenant_code_41` (`tenant_code`),
  UNIQUE KEY `tenant_code_42` (`tenant_code`),
  UNIQUE KEY `tenant_code_43` (`tenant_code`),
  UNIQUE KEY `tenant_code_44` (`tenant_code`),
  KEY `idx_tenant_code` (`tenant_code`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenants`
--

LOCK TABLES `tenants` WRITE;
/*!40000 ALTER TABLE `tenants` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `tenants` VALUES
(1,'Demo Retail Store','DEMO001','admin@demostore.com',NULL,'premium',1,NULL,NULL),
(3,'Demo Company','DEMO0157','contact@democompany.com','+1-666-0100','premium',1,'2025-10-25 15:40:40','2025-10-25 15:40:40'),
(4,'Demo 3','DEMO058','contact@demo3company.com','9998512587','premium',1,'2025-10-27 06:25:27','2025-10-27 06:25:27');
/*!40000 ALTER TABLE `tenants` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `username` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `role` enum('super_admin','admin','manager','viewer') DEFAULT 'viewer',
  `is_active` tinyint(1) DEFAULT 1,
  `last_login` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username_2` (`username`),
  UNIQUE KEY `email_2` (`email`),
  UNIQUE KEY `username_3` (`username`),
  UNIQUE KEY `email_3` (`email`),
  UNIQUE KEY `username_4` (`username`),
  UNIQUE KEY `email_4` (`email`),
  UNIQUE KEY `username_5` (`username`),
  UNIQUE KEY `email_5` (`email`),
  UNIQUE KEY `username_6` (`username`),
  UNIQUE KEY `email_6` (`email`),
  UNIQUE KEY `username_7` (`username`),
  UNIQUE KEY `email_7` (`email`),
  UNIQUE KEY `username_8` (`username`),
  UNIQUE KEY `email_8` (`email`),
  UNIQUE KEY `username_9` (`username`),
  UNIQUE KEY `email_9` (`email`),
  UNIQUE KEY `username_10` (`username`),
  UNIQUE KEY `email_10` (`email`),
  UNIQUE KEY `username_11` (`username`),
  UNIQUE KEY `email_11` (`email`),
  UNIQUE KEY `username_12` (`username`),
  UNIQUE KEY `email_12` (`email`),
  UNIQUE KEY `username_13` (`username`),
  UNIQUE KEY `email_13` (`email`),
  UNIQUE KEY `username_14` (`username`),
  UNIQUE KEY `email_14` (`email`),
  UNIQUE KEY `username_15` (`username`),
  UNIQUE KEY `email_15` (`email`),
  UNIQUE KEY `username_16` (`username`),
  UNIQUE KEY `email_16` (`email`),
  UNIQUE KEY `username_17` (`username`),
  UNIQUE KEY `email_17` (`email`),
  UNIQUE KEY `username_18` (`username`),
  UNIQUE KEY `email_18` (`email`),
  UNIQUE KEY `username_19` (`username`),
  UNIQUE KEY `email_19` (`email`),
  UNIQUE KEY `username_20` (`username`),
  UNIQUE KEY `email_20` (`email`),
  UNIQUE KEY `username_21` (`username`),
  UNIQUE KEY `email_21` (`email`),
  UNIQUE KEY `username_22` (`username`),
  UNIQUE KEY `email_22` (`email`),
  UNIQUE KEY `username_23` (`username`),
  UNIQUE KEY `email_23` (`email`),
  UNIQUE KEY `username_24` (`username`),
  UNIQUE KEY `email_24` (`email`),
  UNIQUE KEY `username_25` (`username`),
  UNIQUE KEY `email_25` (`email`),
  UNIQUE KEY `username_26` (`username`),
  UNIQUE KEY `email_26` (`email`),
  UNIQUE KEY `username_27` (`username`),
  UNIQUE KEY `email_27` (`email`),
  UNIQUE KEY `username_28` (`username`),
  UNIQUE KEY `email_28` (`email`),
  UNIQUE KEY `username_29` (`username`),
  UNIQUE KEY `email_29` (`email`),
  UNIQUE KEY `username_30` (`username`),
  UNIQUE KEY `email_30` (`email`),
  KEY `idx_tenant_user` (`tenant_id`,`user_id`),
  KEY `idx_email` (`email`),
  KEY `idx_username` (`username`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `users` VALUES
(1,1,'admin','admin@demostore.com','$2b$12$xlAAW9ECCur7GVDkwirKFejdYJdrhdcR7JpwwIJr.hth6MJJ63i4O','Admin User','admin',1,'2025-11-01 17:29:23',NULL,NULL),
(2,1,'smarteye_admin','admin@smarteye.com','$2b$12$aaRBv/6i4Wk0FASYJPHsTeQ7mXj9ZDbqHGEp/yla0kJ3LlTbnstSS','SmartEye Admin Super','super_admin',1,'2025-11-01 16:49:22','2025-10-25 15:43:21','2025-10-25 15:43:21'),
(3,4,'User1','thendralraji@gmail.com','$2b$12$6Y8wlyMo0VIdzRQUFCmVHO/.2Uk/AiTX9SZzsg3E9xbjfshWGJyBu','Rajalakshmi','viewer',1,'2025-11-01 16:52:54','2025-11-01 16:52:04','2025-11-01 16:52:04');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `zone_config`
--

DROP TABLE IF EXISTS `zone_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `zone_config` (
  `zone_id` int(11) NOT NULL AUTO_INCREMENT,
  `camera_id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `zone_name` varchar(255) DEFAULT 'Entry/Exit Zone',
  `polygon_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Array of {x, y} coordinates defining the zone' CHECK (json_valid(`polygon_json`)),
  `direction_line_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Line coordinates for entry/exit direction detection' CHECK (json_valid(`direction_line_json`)),
  `entry_direction` varchar(50) DEFAULT 'UP' COMMENT 'Direction considered as entry (UP/DOWN/LEFT/RIGHT)',
  `is_active` tinyint(1) DEFAULT 1,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`zone_id`),
  KEY `idx_camera_zone` (`camera_id`,`zone_id`),
  KEY `idx_tenant_zone` (`tenant_id`,`zone_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `zone_config_ibfk_88` FOREIGN KEY (`camera_id`) REFERENCES `cameras` (`camera_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `zone_config_ibfk_89` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `zone_config_ibfk_90` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `zone_config`
--

LOCK TABLES `zone_config` WRITE;
/*!40000 ALTER TABLE `zone_config` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `zone_config` VALUES
(1,1,1,'Main Entrance - Zone 1','[{\"x\":0.01049999237060547,\"y\":0.018222215440538196},{\"x\":0.9279999923706055,\"y\":0.020444437662760415},{\"x\":0.8392499923706055,\"y\":0.7648888888623979},{\"x\":0.12799999237060547,\"y\":0.7471111110846201}]','[]','UP',1,2,'2025-10-28 15:54:16','2025-10-28 15:54:16'),
(2,1,1,'Main Entrance - Zone 1','[{\"x\":0.7429999923706054,\"y\":0.2839999728732639},{\"x\":0.8467499923706054,\"y\":0.4684444173177083},{\"x\":0.22549999237060547,\"y\":0.8173333401150173},{\"x\":0.15924999237060547,\"y\":0.3284444512261285}]','[{\"x\":0.9079999923706055,\"y\":0.17066667344835068},{\"x\":0.19799999237060548,\"y\":0.05602776421440972},{\"x\":0.10924999237060547,\"y\":0.16047220865885417},{\"x\":0.47424999237060544,\"y\":0.21824998643663193},{\"x\":0.8579999923706054,\"y\":0.15602776421440973}]','LEFT',1,2,'2025-10-28 16:08:42','2025-10-28 16:08:42');
/*!40000 ALTER TABLE `zone_config` ENABLE KEYS */;
UNLOCK TABLES;
commit;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2025-11-03 11:03:48
