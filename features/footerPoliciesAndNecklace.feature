Feature: Footer Policies and Necklace Purchase

  @Test8
  Scenario: Verifying Footer Policies on Reliance-Jewels
    Given the user scrolls to the footer
    When the user clicks on privacy policy
    Then the user clicks on terms and conditions
    And the user clicks on shipping policy
    Then the user clicks on return policy

  @Test9
  Scenario: Buying a Necklace from Reliance-Jewels
    Given the user navigates to the necklace section
    Then the user clicks on the first necklace product
    And the user adds the necklace to the cart
    Then the user verifies the cart
    And the user proceeds to pay for the necklace
