import { useEffect, useState } from 'react';
import { useClient, useFormValue, set, type ImageInputProps } from 'sanity';
import { Box, Card, Flex, Grid, Text } from '@sanity/ui';

// Above the normal image field: the stills of the linked project, click one to use it.
export function ProjectStillPicker(props: ImageInputProps) {
  const ref = (useFormValue(['project']) as { _ref?: string } | undefined)?._ref;
  const client = useClient({ apiVersion: '2025-01-01' });
  const [stills, setStills] = useState<{ id: string; url: string }[]>([]);
  const current = (props.value as any)?.asset?._ref;

  useEffect(() => {
    if (!ref) { setStills([]); return; }
    client
      .fetch(`*[_id in [$id, "drafts." + $id]][0]{ "s": [heroImage, ...coalesce(stills, []), ...coalesce(btsImages, [])][defined(asset)]{ "id": asset._ref, "url": asset->url } }`, { id: ref })
      .then((r: any) => setStills(((r?.s || []) as any[]).filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i)))
      .catch(() => setStills([]));
  }, [ref, client]);

  return (
    <Flex direction="column" gap={3}>
      {ref ? (
        stills.length ? (
          <Box>
            <Text size={1} muted>Kies een beeld uit het gekoppelde project, of upload hieronder een ander.</Text>
            <Grid columns={[3, 4, 6]} gap={2} marginTop={3}>
              {stills.map((s) => (
                <Card
                  key={s.id} as="button" type="button" radius={2} padding={0}
                  tone={s.id === current ? 'primary' : 'default'}
                  style={{ cursor: 'pointer', overflow: 'hidden', outline: s.id === current ? '3px solid #2276fc' : 'none', border: 0 }}
                  onClick={() => props.onChange(set({ _type: 'image', asset: { _type: 'reference', _ref: s.id } }))}
                >
                  <img src={`${s.url}?w=240&h=160&fit=crop&auto=format`} alt="" style={{ display: 'block', width: '100%', aspectRatio: '3 / 2', objectFit: 'cover' }} />
                </Card>
              ))}
            </Grid>
          </Box>
        ) : (
          <Text size={1} muted>Het gekoppelde project heeft nog geen beelden.</Text>
        )
      ) : (
        <Text size={1} muted>Koppel hierboven een project om uit de beelden daarvan te kiezen. Laat je dit leeg, dan gebruikt de site de eerste still van het project.</Text>
      )}
      {props.renderDefault(props)}
    </Flex>
  );
}
