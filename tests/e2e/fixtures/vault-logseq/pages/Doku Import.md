fixture:: Plain page linked from journals; holds an advanced query (K7 query parsing).

- What the importer keeps: pages, journals, properties, block refs, assets.
- #+BEGIN_QUERY
  {:title "Open tasks"
   :query [:find (pull ?b [*])
           :where [?b :block/marker ?m]
                  [(contains? #{"TODO" "DOING"} ?m)]]}
  #+END_QUERY
- ![diagram](../assets/diagram.png)
