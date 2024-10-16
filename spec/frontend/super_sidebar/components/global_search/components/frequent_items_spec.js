import { GlDisclosureDropdownGroup, GlDisclosureDropdownItem, GlIcon } from '@gitlab/ui';
import { shallowMountExtended } from 'helpers/vue_test_utils_helper';
import GlobalSearchFrequentItems from '~/super_sidebar/components/global_search/components/frequent_items.vue';
import FrequentItem from '~/super_sidebar/components/global_search/components/frequent_item.vue';
import FrequentItemSkeleton from '~/super_sidebar/components/global_search/components/frequent_item_skeleton.vue';
import { getItemsFromLocalStorage, removeItemFromLocalStorage } from '~/super_sidebar/utils';
import { cachedFrequentProjects } from 'jest/super_sidebar/mock_data';

jest.mock('~/super_sidebar/utils', () => {
  const original = jest.requireActual('~/super_sidebar/utils');

  return {
    ...original,
    getItemsFromLocalStorage: jest.fn(),
    removeItemFromLocalStorage: jest.fn(),
  };
});

describe('FrequentlyVisitedItems', () => {
  let wrapper;
  const storageKey = 'mockStorageKey';
  const mockStoredItems = JSON.parse(cachedFrequentProjects);
  const mockProps = {
    emptyStateText: 'mock empty state text',
    groupName: 'mock group name',
    maxItems: 42,
    storageKey,
    viewAllItemsText: 'View all items',
    viewAllItemsIcon: 'question-o',
    viewAllItemsPath: '/mock/all_items',
  };

  const createComponent = (props, frecentNamespacesSuggestionsEnabled = true) => {
    wrapper = shallowMountExtended(GlobalSearchFrequentItems, {
      propsData: {
        ...mockProps,
        ...props,
      },
      provide: {
        glFeatures: {
          frecentNamespacesSuggestions: frecentNamespacesSuggestionsEnabled,
        },
      },
      stubs: {
        GlDisclosureDropdownGroup,
      },
    });
  };

  const findItems = () => wrapper.findAllComponents(GlDisclosureDropdownItem);
  const findSkeleton = () => wrapper.findComponent(FrequentItemSkeleton);
  const findItemRenderer = (root) => root.findComponent(FrequentItem);

  const setStoredItems = (items) => {
    getItemsFromLocalStorage.mockReturnValue(items);
  };

  describe('when the frecentNamespacesSuggestions feature flag is disabled', () => {
    beforeEach(() => {
      setStoredItems(mockStoredItems);
    });

    describe('without a storage key', () => {
      beforeEach(() => {
        createComponent({ storageKey: null }, false);
      });

      it('does not render anything', () => {
        expect(wrapper.html()).toBe('');
      });

      it('emits a nothing-to-render event', () => {
        expect(wrapper.emitted('nothing-to-render')).toEqual([[]]);
      });
    });

    describe('with a storageKey', () => {
      beforeEach(() => {
        createComponent({}, false);
      });

      describe('common behavior', () => {
        it('calls getItemsFromLocalStorage', () => {
          expect(getItemsFromLocalStorage).toHaveBeenCalledWith({
            storageKey,
            maxItems: mockProps.maxItems,
          });
        });

        it('renders the group name', () => {
          expect(wrapper.text()).toContain(mockProps.groupName);
        });

        it('renders the view all items link', () => {
          const lastItem = findItems().at(-1);
          expect(lastItem.props('item')).toMatchObject({
            text: mockProps.viewAllItemsText,
            href: mockProps.viewAllItemsPath,
          });

          const icon = lastItem.findComponent(GlIcon);
          expect(icon.props('name')).toBe(mockProps.viewAllItemsIcon);
        });
      });

      describe('with stored items', () => {
        it('renders the items', () => {
          const items = findItems();

          mockStoredItems.forEach((storedItem, index) => {
            const dropdownItem = items.at(index);

            // Check GlDisclosureDropdownItem's item has the right structure
            expect(dropdownItem.props('item')).toMatchObject({
              text: storedItem.name,
              href: storedItem.webUrl,
            });

            // Check FrequentItem's item has the right structure
            expect(findItemRenderer(dropdownItem).props('item')).toMatchObject({
              id: storedItem.id,
              title: storedItem.name,
              subtitle: expect.any(String),
              avatar: storedItem.avatarUrl,
            });
          });
        });

        it('does not render the empty state text', () => {
          expect(wrapper.text()).not.toContain('mock empty state text');
        });

        describe('removing an item', () => {
          let itemToRemove;

          beforeEach(() => {
            const itemRenderer = findItemRenderer(findItems().at(0));
            itemToRemove = itemRenderer.props('item');
            itemRenderer.vm.$emit('remove', itemToRemove);
          });

          it('calls removeItemFromLocalStorage when an item emits a remove event', () => {
            expect(removeItemFromLocalStorage).toHaveBeenCalledWith({
              storageKey,
              item: itemToRemove,
            });
          });

          it('no longer renders that item', () => {
            const renderedItemTexts = findItems().wrappers.map((item) => item.props('item').text);
            expect(renderedItemTexts).not.toContain(itemToRemove.text);
          });
        });
      });
    });

    describe('with no stored items', () => {
      beforeEach(() => {
        setStoredItems([]);
        createComponent({}, false);
      });

      it('renders the empty state text', () => {
        expect(wrapper.text()).toContain(mockProps.emptyStateText);
      });
    });
  });

  describe('when the frecentNamespacesSuggestions feature flag is enabled', () => {
    describe('while items are being fetched', () => {
      beforeEach(() => {
        createComponent({
          loading: true,
        });
      });

      it('shows the loading state', () => {
        expect(findSkeleton().exists()).toBe(true);
      });

      it('does not show the empty state', () => {
        expect(wrapper.text()).not.toContain(mockProps.emptyStateText);
      });
    });

    describe('when there are no items', () => {
      beforeEach(() => {
        createComponent();
      });

      it('does not show the loading state', () => {
        expect(findSkeleton().exists()).toBe(false);
      });

      it('shows the empty state', () => {
        expect(wrapper.text()).toContain(mockProps.emptyStateText);
      });
    });

    describe('when there are items', () => {
      beforeEach(() => {
        createComponent({
          items: mockStoredItems,
        });
      });

      it('renders the items', () => {
        const items = findItems();

        mockStoredItems.forEach((storedItem, index) => {
          const dropdownItem = items.at(index);

          // Check GlDisclosureDropdownItem's item has the right structure
          expect(dropdownItem.props('item')).toMatchObject({
            text: storedItem.name,
            href: storedItem.webUrl,
          });

          // Check FrequentItem's item has the right structure
          expect(findItemRenderer(dropdownItem).props('item')).toMatchObject({
            id: storedItem.id,
            title: storedItem.name,
            subtitle: expect.any(String),
            avatar: storedItem.avatarUrl,
          });
        });
      });

      it('does not show the loading state', () => {
        expect(findSkeleton().exists()).toBe(false);
      });

      it('does not show the empty state', () => {
        expect(wrapper.text()).not.toContain(mockProps.emptyStateText);
      });
    });
  });
});
