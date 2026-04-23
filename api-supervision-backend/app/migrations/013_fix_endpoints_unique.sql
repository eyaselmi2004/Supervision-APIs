ALTER TABLE endpoints
ADD CONSTRAINT uq_endpoints_api_service_path_method
UNIQUE (api_service_id, path, method);