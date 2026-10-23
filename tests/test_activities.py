def test_root_redirects_to_static_page(client):
    # Arrange
    expected_location = "/static/index.html"

    # Act
    response = client.get("/", follow_redirects=False)

    # Assert
    assert response.status_code == 307
    assert response.headers["location"] == expected_location


def test_get_activities_returns_all_activities(client):
    # Arrange
    expected_count = 9

    # Act
    response = client.get("/activities")

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert len(data) == expected_count
    assert "Chess Club" in data


def test_activities_have_expected_fields(client):
    # Arrange
    expected_fields = {"description", "schedule", "max_participants", "participants"}

    # Act
    data = client.get("/activities").json()

    # Assert
    for details in data.values():
        assert set(details) == expected_fields
        assert isinstance(details["participants"], list)


def test_get_activities_is_not_cacheable(client):
    # Arrange
    expected_header = "no-store"

    # Act
    response = client.get("/activities")

    # Assert
    assert response.headers["cache-control"] == expected_header
