"""Paperless-ngx integration provider."""
from typing import Any

import httpx

from src.integrations.base import DocumentProvider
from src.integrations.registry import IntegrationRegistry


@IntegrationRegistry.register
class PaperlessProvider(DocumentProvider):
    """Paperless-ngx document management integration."""

    @classmethod
    def get_type(cls) -> str:
        return "paperless"

    @classmethod
    def get_display_name(cls) -> str:
        return "Paperless-ngx"

    @classmethod
    def get_config_schema(cls) -> dict[str, Any]:
        return {
            "type": "object",
            "required": ["url", "token"],
            "properties": {
                "url": {
                    "type": "string",
                    "title": "Paperless URL",
                    "description": "Base URL of your Paperless-ngx instance",
                    "format": "uri",
                },
                "token": {
                    "type": "string",
                    "title": "API Token",
                    "description": "API token from Paperless-ngx",
                    "format": "password",
                },
                "custom_field_name": {
                    "type": "string",
                    "title": "Event Field Name",
                    "description": "Name of the custom field used to tag documents with event names",
                    "default": "Trip",
                },
            },
        }

    def __init__(self, config: dict[str, Any]):
        self.url = config["url"].rstrip("/")
        self.token = config["token"]
        self.custom_field_name = config.get("custom_field_name", "Trip")
        self._client = httpx.AsyncClient(
            base_url=self.url,
            headers={"Authorization": f"Token {self.token}"},
            timeout=30.0,
        )

    async def close(self) -> None:
        """Close the HTTP client."""
        await self._client.aclose()

    async def health_check(self) -> tuple[bool, str]:
        """Check connectivity to Paperless-ngx."""
        try:
            resp = await self._client.get("/api/")
            if resp.status_code == 200:
                return True, "Connected"
            return False, f"HTTP {resp.status_code}"
        except httpx.ConnectError:
            return False, "Connection failed"
        except httpx.TimeoutException:
            return False, "Connection timeout"
        except Exception as e:
            return False, str(e)

    async def list_storage_paths(self) -> list[dict[str, Any]]:
        """List available storage paths from Paperless-ngx."""
        results = []
        url = "/api/storage_paths/"
        while url:
            resp = await self._client.get(url)
            resp.raise_for_status()
            data = resp.json()
            results.extend(data.get("results", []))
            url = data.get("next")
            if url:
                # Handle relative URLs
                url = url.replace(self.url, "")
        return [
            {"id": sp["id"], "name": sp["name"], "path": sp.get("path", "")}
            for sp in results
        ]

    async def list_tags(self) -> list[dict[str, Any]]:
        """List all tags from Paperless-ngx."""
        results = []
        url = "/api/tags/"
        while url:
            resp = await self._client.get(url)
            resp.raise_for_status()
            data = resp.json()
            results.extend(data.get("results", []))
            url = data.get("next")
            if url:
                url = url.replace(self.url, "")
        return [{"id": tag["id"], "name": tag["name"]} for tag in results]

    async def create_tag(self, name: str) -> dict[str, Any]:
        """Create a new tag in Paperless-ngx."""
        resp = await self._client.post("/api/tags/", json={"name": name})
        resp.raise_for_status()
        data = resp.json()
        return {"id": data["id"], "name": data["name"]}

    async def get_tag_by_name(self, name: str) -> dict[str, Any] | None:
        """Get a tag by name from Paperless-ngx."""
        resp = await self._client.get("/api/tags/", params={"name__iexact": name})
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", [])
        if results:
            return {"id": results[0]["id"], "name": results[0]["name"]}
        return None

    async def get_documents(
        self,
        tag_id: int | None = None,
        storage_path_id: int | None = None,
        custom_field_value: str | None = None,
    ) -> list[dict[str, Any]]:
        """Query documents from Paperless-ngx."""
        params: dict[str, Any] = {}
        if tag_id is not None:
            params["tags__id__in"] = tag_id
        if storage_path_id is not None:
            params["storage_path__id"] = storage_path_id
        if custom_field_value is not None:
            params["custom_fields__icontains"] = custom_field_value

        results = []
        url = "/api/documents/"
        while url:
            resp = await self._client.get(url, params=params if url == "/api/documents/" else None)
            resp.raise_for_status()
            data = resp.json()
            results.extend(data.get("results", []))
            url = data.get("next")
            if url:
                url = url.replace(self.url, "")
                params = {}  # params already in URL

        return [
            {
                "id": doc["id"],
                "title": doc.get("title", ""),
                "created": doc.get("created"),
                "added": doc.get("added"),
                "original_file_name": doc.get("original_file_name", ""),
                "tags": doc.get("tags", []),
                "storage_path": doc.get("storage_path"),
            }
            for doc in results
        ]

    async def download_document(self, doc_id: int) -> tuple[bytes, str, str]:
        """Download a document from Paperless-ngx."""
        # First get document metadata for filename
        meta_resp = await self._client.get(f"/api/documents/{doc_id}/")
        meta_resp.raise_for_status()
        meta = meta_resp.json()
        original_filename = meta.get("original_file_name", f"document_{doc_id}.pdf")

        # Download the actual document
        resp = await self._client.get(f"/api/documents/{doc_id}/download/")
        resp.raise_for_status()

        content_type = resp.headers.get("content-type", "application/pdf")
        return resp.content, original_filename, content_type

    async def list_custom_fields(self) -> list[dict[str, Any]]:
        """List all custom fields from Paperless-ngx."""
        results = []
        url = "/api/custom_fields/"
        while url:
            resp = await self._client.get(url)
            resp.raise_for_status()
            data = resp.json()
            results.extend(data.get("results", []))
            url = data.get("next")
            if url:
                url = url.replace(self.url, "")
        return [
            {
                "id": cf["id"],
                "name": cf["name"],
                "data_type": cf.get("data_type", ""),
                "extra_data": cf.get("extra_data", {}),
            }
            for cf in results
        ]

    async def get_custom_field_by_name(self, name: str) -> dict[str, Any] | None:
        """Get a custom field by name from Paperless-ngx."""
        resp = await self._client.get("/api/custom_fields/", params={"name__iexact": name})
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", [])
        if results:
            cf = results[0]
            return {
                "id": cf["id"],
                "name": cf["name"],
                "data_type": cf.get("data_type", ""),
                "extra_data": cf.get("extra_data", {}),
            }
        return None

    async def get_custom_field(self, field_id: int) -> dict[str, Any] | None:
        """Get a custom field by ID from Paperless-ngx."""
        try:
            resp = await self._client.get(f"/api/custom_fields/{field_id}/")
            resp.raise_for_status()
            cf = resp.json()
            return {
                "id": cf["id"],
                "name": cf["name"],
                "data_type": cf.get("data_type", ""),
                "extra_data": cf.get("extra_data", {}),
            }
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return None
            raise

    async def add_custom_field_choice(self, field_id: int, choice: str) -> bool:
        """
        Add a new choice to a select-type custom field in Paperless-ngx.
        Returns True if the choice was added, False if it already exists.
        """
        # First get the current field data
        field = await self.get_custom_field(field_id)
        if not field:
            raise ValueError(f"Custom field {field_id} not found")

        if field["data_type"] != "select":
            raise ValueError(f"Custom field {field_id} is not a select type")

        # Get current options
        extra_data = field.get("extra_data") or {}
        current_options = extra_data.get("select_options") or []

        # Check if choice already exists (case-insensitive)
        for opt in current_options:
            if opt.lower() == choice.lower():
                return False  # Already exists

        # Add the new choice
        new_options = current_options + [choice]
        new_extra_data = {**extra_data, "select_options": new_options}

        # Update the field
        resp = await self._client.patch(
            f"/api/custom_fields/{field_id}/",
            json={"extra_data": new_extra_data},
        )
        resp.raise_for_status()
        return True

    async def get_custom_field_choices(self, field_id: int) -> list[str]:
        """Get the choices for a select-type custom field."""
        field = await self.get_custom_field(field_id)
        if not field:
            return []

        if field["data_type"] != "select":
            return []

        extra_data = field.get("extra_data") or {}
        return extra_data.get("select_options") or []

    async def check_custom_field_choice_exists(self, field_id: int, choice: str) -> bool:
        """Check if a choice exists in a select-type custom field (case-insensitive)."""
        choices = await self.get_custom_field_choices(field_id)
        return any(c.lower() == choice.lower() for c in choices)
