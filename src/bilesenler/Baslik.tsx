import { StyleSheet, Text, View } from 'react-native';
import { useRenk } from '../tema';

/** Uygulamanın adı: kalın, büyük, iki katlı logo yazısı. */
export function Baslik({ buyuk = false }: { buyuk?: boolean }) {
  const renk = useRenk();
  const ana = renk.baslik ?? renk.vurgu;
  const olcek = buyuk ? 1.15 : 1;
  return (
    <View style={s.kutu}>
      <Text style={[s.ust, { color: renk.yazi, fontSize: 18 * olcek, letterSpacing: 6 * olcek }]}>
        BİR BAŞKADIR
      </Text>
      <Text
        style={[s.alt, {
          color: ana, fontSize: 44 * olcek, lineHeight: 48 * olcek,
          textShadowColor: 'rgba(0,0,0,0.18)', textShadowOffset: { width: 2, height: 3 }, textShadowRadius: 0,
        }]}
        adjustsFontSizeToFit numberOfLines={1}
      >
        MEMLEKETİM
      </Text>
      <View style={[s.serit, { backgroundColor: ana }]} />
    </View>
  );
}

const s = StyleSheet.create({
  kutu: { alignSelf: 'flex-start', marginBottom: 4 },
  ust: { fontWeight: '800' },
  alt: { fontWeight: '900', letterSpacing: 1, marginTop: -2 },
  serit: { height: 6, width: 72, borderRadius: 3, marginTop: 6 },
});
