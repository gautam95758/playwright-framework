Feature: Buy Pendents and Rings

  @Test1
  Scenario: Buying pendents from Reliance-Jewels
    Given the user hovers over pendents
    When the user applies the gender filter
    Then the user selects additional filters
    And the user clicks on the first product displayed
    And the user adds the selected product to the cart
    Then the user proceeds to the payment page

  @Test2
  Scenario Outline: Purchasing the Ring from Reliance-Jewels
    Given the user initiates the search functionality
    When the user inputs "<item>" into the designated search field
    And the user confirms the search by pressing the Enter key
    Then the user applies the gender-specific filter
    And the user selects the preferred metal category
    And the user identifies and clicks on the first product displayed in the results
    Then the user proceeds to add the selected item to the shopping cart

    Examples:
      | item  |
      | Rings |
