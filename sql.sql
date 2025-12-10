-- ============================================================
--  TẠO DATABASE (nếu cần)
-- ============================================================
CREATE DATABASE IF NOT EXISTS ql_dang_ky_hoc
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ql_dang_ky_hoc;

-- ============================================================
--  NHÓM LOOKUP CHUNG
-- ============================================================

CREATE TABLE lookup_role (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  ma_role   VARCHAR(50) NOT NULL UNIQUE, -- 'ADMIN', 'GIANG_VIEN', 'SINH_VIEN'
  mo_ta     VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lookup_user_type (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  ten_user_type VARCHAR(50) NOT NULL UNIQUE  -- 'ADMIN','GIANG_VIEN','SINH_VIEN'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lookup_trang_thai_user (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  ten_trang_thai  VARCHAR(50) NOT NULL       -- 'ACTIVE','LOCKED',...
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lookup_gioi_tinh (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  ten_gioi_tinh  VARCHAR(20) NOT NULL  -- 'Nam','Nữ','Khác'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lookup_trang_thai_sv (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  ten_trang_thai VARCHAR(50) NOT NULL  -- 'Đang học','Bảo lưu','Thôi học',...
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lookup_trang_thai_phong (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  ten_trang_thai VARCHAR(50) NOT NULL  -- 'Đang sử dụng','Bảo trì',...
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lookup_trang_thai_lop_hoc_phan (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  ten_trang_thai VARCHAR(50) NOT NULL -- 'Đang mở','Đóng','Hủy','Đã kết thúc'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lookup_trang_thai_dang_ky_lhp (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  ten_trang_thai VARCHAR(50) NOT NULL -- 'Đăng ký','Hủy','Bị hủy'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lookup_trang_thai_ke_hoach_thi (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  ten_trang_thai VARCHAR(50) NOT NULL -- 'Dự thảo','Đã duyệt','Đã khóa',...
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lookup_hinh_thuc_thi (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  ten_hinh_thuc  VARCHAR(50) NOT NULL -- 'Tự luận','Trắc nghiệm','Vấn đáp',...
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lookup_xep_loai (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  ten_xep_loai  VARCHAR(50) NOT NULL  -- 'A','B','C','Giỏi','Khá',...
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  AUTH: USERS & REFRESH TOKENS
-- ============================================================

CREATE TABLE users (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  username        VARCHAR(50) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  email           VARCHAR(100) UNIQUE,
  role_id         INT NOT NULL,
  user_type_id    INT NOT NULL,
  user_ref_id     INT NOT NULL,  -- id bên bảng giang_vien / sinh_vien / admin
  trang_thai_id   INT NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role       FOREIGN KEY (role_id)       REFERENCES lookup_role(id),
  CONSTRAINT fk_users_user_type  FOREIGN KEY (user_type_id)  REFERENCES lookup_user_type(id),
  CONSTRAINT fk_users_trang_thai FOREIGN KEY (trang_thai_id) REFERENCES lookup_trang_thai_user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE refresh_tokens (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  token_hash   CHAR(64) NOT NULL,
  user_agent   VARCHAR(255),
  ip_address   VARCHAR(45),
  expires_at   DATETIME NOT NULL,
  revoked_at   DATETIME NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rt_users FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  KHOA, GIẢNG VIÊN, SINH VIÊN
-- ============================================================

CREATE TABLE khoa (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  ma_khoa        VARCHAR(20) NOT NULL UNIQUE,
  ten_khoa       VARCHAR(100) NOT NULL,
  mo_ta          VARCHAR(255),
  truong_khoa_id INT NULL,  -- có thể liên kết giang_vien.id bằng ALTER sau nếu muốn
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE giang_vien (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  ma_gv        VARCHAR(20) NOT NULL UNIQUE,
  ho_ten       VARCHAR(100) NOT NULL,
  email        VARCHAR(100) UNIQUE,
  sdt          VARCHAR(20),
  khoa_id      INT NOT NULL,
  gioi_tinh_id INT,
  ngay_sinh    DATE,
  hoc_ham      VARCHAR(50),
  hoc_vi       VARCHAR(50),
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_gv_khoa       FOREIGN KEY (khoa_id)      REFERENCES khoa(id),
  CONSTRAINT fk_gv_gioi_tinh  FOREIGN KEY (gioi_tinh_id) REFERENCES lookup_gioi_tinh(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sinh_vien (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  ma_sv          VARCHAR(20) NOT NULL UNIQUE,
  ho_ten         VARCHAR(100) NOT NULL,
  email          VARCHAR(100) UNIQUE,
  sdt            VARCHAR(20),
  khoa_id        INT NOT NULL,
  lop_nien_che   VARCHAR(50),
  khoa_hoc       INT,
  gioi_tinh_id   INT,
  ngay_sinh      DATE,
  trang_thai_id  INT NOT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sv_khoa        FOREIGN KEY (khoa_id)       REFERENCES khoa(id),
  CONSTRAINT fk_sv_gioi_tinh   FOREIGN KEY (gioi_tinh_id)  REFERENCES lookup_gioi_tinh(id),
  CONSTRAINT fk_sv_trang_thai  FOREIGN KEY (trang_thai_id) REFERENCES lookup_trang_thai_sv(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  MÔN HỌC & LIÊN KẾT KHOA - MÔN
-- ============================================================

CREATE TABLE mon_hoc (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  ma_mon            VARCHAR(20) NOT NULL UNIQUE,
  ten_mon           VARCHAR(255) NOT NULL,
  so_tin_chi        INT NOT NULL,
  so_tiet_ly_thuyet INT,
  so_tiet_thuc_hanh INT,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE khoa_mon_hoc (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  khoa_id       INT NOT NULL,
  mon_hoc_id    INT NOT NULL,
  la_khoa_chinh TINYINT(1) NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_kmh_khoa   FOREIGN KEY (khoa_id)    REFERENCES khoa(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_kmh_monhoc FOREIGN KEY (mon_hoc_id) REFERENCES mon_hoc(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT uq_kmh_khoa_mon UNIQUE (khoa_id, mon_hoc_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  PHÒNG HỌC, CA HỌC, KỲ HỌC
-- ============================================================

CREATE TABLE phong_hoc (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  ma_phong       VARCHAR(20) NOT NULL UNIQUE,
  toa_nha        VARCHAR(50),
  suc_chua       INT,
  trang_thai_id  INT NOT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ph_trang_thai FOREIGN KEY (trang_thai_id) REFERENCES lookup_trang_thai_phong(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ca_hoc (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  ma_ca        VARCHAR(20) NOT NULL UNIQUE, -- CA1, CA2,...
  gio_bat_dau  TIME NOT NULL,
  gio_ket_thuc TIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ky_hoc (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  nam_hoc        VARCHAR(9) NOT NULL,  -- '2025-2026'
  hoc_ky         TINYINT NOT NULL,     -- 1,2,3
  ngay_bat_dau   DATE,
  ngay_ket_thuc  DATE,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  LỚP HỌC PHẦN (TKB TOÀN TRƯỜNG, GV, PHÒNG, CA BẮT ĐẦU/CA KẾT THÚC)
-- ============================================================

CREATE TABLE lop_hoc_phan (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  ma_lop_hp           VARCHAR(30) NOT NULL UNIQUE,
  mon_hoc_id          INT NOT NULL,
  ky_hoc_id           INT NOT NULL,
  phong_id            INT NOT NULL,
  giang_vien_id       INT NOT NULL,
  thu_trong_tuan      TINYINT NOT NULL,   -- 2–7 (Thứ 2 -> CN)

  ca_bat_dau_id       INT NOT NULL,       -- Ca bắt đầu
  ca_ket_thuc_id      INT NOT NULL,       -- Ca kết thúc

  si_so_toi_da        INT NOT NULL,
  si_so_du_kien       INT,
  si_so_thuc_te       INT,

  trang_thai_id       INT NOT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_lhp_mh           FOREIGN KEY (mon_hoc_id)    REFERENCES mon_hoc(id),
  CONSTRAINT fk_lhp_ky           FOREIGN KEY (ky_hoc_id)     REFERENCES ky_hoc(id),
  CONSTRAINT fk_lhp_phong        FOREIGN KEY (phong_id)      REFERENCES phong_hoc(id),
  CONSTRAINT fk_lhp_gv           FOREIGN KEY (giang_vien_id) REFERENCES giang_vien(id),
  CONSTRAINT fk_lhp_ca_bd        FOREIGN KEY (ca_bat_dau_id) REFERENCES ca_hoc(id),
  CONSTRAINT fk_lhp_ca_kt        FOREIGN KEY (ca_ket_thuc_id) REFERENCES ca_hoc(id),
  CONSTRAINT fk_lhp_tt           FOREIGN KEY (trang_thai_id) REFERENCES lookup_trang_thai_lop_hoc_phan(id),
  CHECK (ca_bat_dau_id <= ca_ket_thuc_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  ĐĂNG KÝ LỚP HỌC PHẦN (PHÂN BỔ SINH VIÊN THEO LỊCH)
-- ============================================================

CREATE TABLE dang_ky_lop_hoc_phan (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  sinh_vien_id    INT NOT NULL,
  lop_hoc_phan_id INT NOT NULL,
  ngay_dang_ky    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  trang_thai_id   INT NOT NULL,
  ghi_chu         VARCHAR(255),
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_dk_sv   FOREIGN KEY (sinh_vien_id)    REFERENCES sinh_vien(id),
  CONSTRAINT fk_dk_lhp  FOREIGN KEY (lop_hoc_phan_id) REFERENCES lop_hoc_phan(id),
  CONSTRAINT fk_dk_trang_thai FOREIGN KEY (trang_thai_id) REFERENCES lookup_trang_thai_dang_ky_lhp(id),
  CONSTRAINT uq_dk_sv_lhp UNIQUE (sinh_vien_id, lop_hoc_phan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  KẾ HOẠCH THI & LỊCH THI
-- ============================================================

CREATE TABLE ke_hoach_thi (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  ky_hoc_id      INT NOT NULL,
  mon_hoc_id     INT NOT NULL,
  mo_ta          VARCHAR(255),
  ngay_bat_dau   DATE,
  ngay_ket_thuc  DATE,
  trang_thai_id  INT NOT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_kht_ky      FOREIGN KEY (ky_hoc_id)     REFERENCES ky_hoc(id),
  CONSTRAINT fk_kht_mh      FOREIGN KEY (mon_hoc_id)    REFERENCES mon_hoc(id),
  CONSTRAINT fk_kht_tt      FOREIGN KEY (trang_thai_id) REFERENCES lookup_trang_thai_ke_hoach_thi(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lich_thi (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  ke_hoach_thi_id  INT NOT NULL,
  lop_hoc_phan_id  INT NOT NULL,
  phong_id         INT NOT NULL,
  ngay_thi         DATE NOT NULL,
  ca_hoc_id        INT NOT NULL,
  hinh_thuc_thi_id INT NOT NULL,
  ghi_chu          VARCHAR(255),
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lt_kht   FOREIGN KEY (ke_hoach_thi_id)  REFERENCES ke_hoach_thi(id),
  CONSTRAINT fk_lt_lhp   FOREIGN KEY (lop_hoc_phan_id)  REFERENCES lop_hoc_phan(id),
  CONSTRAINT fk_lt_phong FOREIGN KEY (phong_id)         REFERENCES phong_hoc(id),
  CONSTRAINT fk_lt_ca    FOREIGN KEY (ca_hoc_id)        REFERENCES ca_hoc(id),
  CONSTRAINT fk_lt_htthi FOREIGN KEY (hinh_thuc_thi_id) REFERENCES lookup_hinh_thuc_thi(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  KẾT QUẢ HỌC TẬP / ĐIỂM
-- ============================================================

CREATE TABLE ket_qua_hoc_tap (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  sinh_vien_id    INT NOT NULL,
  lop_hoc_phan_id INT NOT NULL,
  diem_qua_trinh  DECIMAL(4,2),
  diem_thi        DECIMAL(4,2),
  diem_tong       DECIMAL(4,2),
  xep_loai_id     INT,
  lan_thi         TINYINT NOT NULL DEFAULT 1,
  ngay_nhap_diem  DATETIME,
  nguoi_nhap_id   INT,  -- users.id
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_kq_sv      FOREIGN KEY (sinh_vien_id)    REFERENCES sinh_vien(id),
  CONSTRAINT fk_kq_lhp     FOREIGN KEY (lop_hoc_phan_id) REFERENCES lop_hoc_phan(id),
  CONSTRAINT fk_kq_xeploai FOREIGN KEY (xep_loai_id)     REFERENCES lookup_xep_loai(id),
  CONSTRAINT fk_kq_user    FOREIGN KEY (nguoi_nhap_id)   REFERENCES users(id),
  CONSTRAINT uq_kq_sv_lhp_lan UNIQUE (sinh_vien_id, lop_hoc_phan_id, lan_thi)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  HẾT FILE
-- ============================================================
