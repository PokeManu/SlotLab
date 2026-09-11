CREATE INDEX idx_spaces_building ON spaces (building_id);
CREATE INDEX idx_space_services_service ON space_services (service_id);
CREATE INDEX idx_availabilities_space_schedule
  ON availabilities (space_id, is_retired, weekday, valid_from, valid_until, start_time, end_time);
CREATE INDEX idx_unavailabilities_space_date
  ON unavailabilities (space_id, date, start_time, end_time);
CREATE INDEX idx_bookings_availability_space ON bookings (availability_id, space_id);
CREATE INDEX idx_bookings_space_date_status ON bookings (space_id, date, status);
CREATE INDEX idx_booking_participants_user ON booking_participants (user_id, booking_id);
CREATE INDEX idx_favorites_space ON favorites (space_id);
CREATE INDEX idx_reports_space ON reports (space_id);
CREATE INDEX idx_reports_status_created ON reports (status, created_at);
CREATE INDEX idx_announcements_author ON announcements (author_id);
CREATE INDEX idx_notifications_announcement ON notifications (announcement_id);
CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at);
CREATE INDEX idx_booking_requests_booking ON booking_requests (booking_id);
CREATE INDEX idx_occurrence_issues_space_date ON occurrence_issues (space_id, date);
